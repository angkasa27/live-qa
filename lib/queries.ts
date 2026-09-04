import "server-only";
import { query, one } from "./db.ts";
import type { Event, Page, Question, QuestionStatus, Revision } from "./types.ts";
import { PAGE_SIZE } from "./types.ts";

// Columns that may cross to the browser. `contact`, `asker_token` and `ip_hash` are deliberately
// not in this list and must never be added to it; see ROADMAP.md §3, "Anonymity is display, not
// identity". `mine` is computed per-request from the caller's own token.
// `edited` is a count, never the revisions: what crosses to the browser is that the answer moved,
// not what it used to say. The history is an admin screen; see listRevisions below.
// The first save writes revision #1, so "> 1" is what makes this an edit rather than an answer.
const PUBLIC_COLS = `
  q.id, q.event_id, q.body, q.status, q.answer, q.retracted, q.author,
  q.created_at, q.source, q.video_start,
  (select count(*) > 1 from answer_revisions r where r.question_id = q.id) as edited,
  (q.asker_token is not null and q.asker_token = $TOKEN) as mine
`;

type QuestionRow = {
  id: string;
  event_id: string;
  body: string;
  status: QuestionStatus;
  answer: string | null;
  retracted: boolean;
  author: string | null;
  created_at: Date;
  source: "transcript" | null;
  video_start: number | null;
  edited: boolean | null;
  mine: boolean | null;
};

function toQuestion(r: QuestionRow): Question {
  return {
    id: r.id,
    eventId: r.event_id,
    body: r.body,
    status: r.status,
    // A retracted answer is withdrawn from display but kept in the row and in
    // answer_revisions. Nothing is ever deleted.
    answer: r.retracted ? null : r.answer,
    retracted: r.retracted,
    author: r.author,
    createdAt: r.created_at.toISOString(),
    ...(r.source ? { source: r.source } : {}),
    ...(r.video_start != null ? { videoStart: r.video_start } : {}),
    ...(r.edited ? { edited: true } : {}),
    ...(r.mine ? { mine: true } : {}),
  };
}

// Always qualified with the `e` alias: the admin list joins questions, and an unqualified `id`
// is ambiguous the moment it does. Every reader below selects `from events e`.
const EVENT_COLS = `
  e.id, e.name, e.starts_at, e.venue, e.speaker, e.status,
  coalesce(e.accepting_questions, e.status = 'live') as accepting_questions,
  e.moderation, e.hidden, e.image, e.youtube_id
`;

type EventRow = {
  id: string;
  name: string;
  starts_at: Date;
  venue: string;
  speaker: string;
  status: Event["status"];
  accepting_questions: boolean;
  moderation: Event["moderation"];
  hidden: boolean;
  image: string | null;
  youtube_id: string | null;
};

function toEvent(r: EventRow): Event {
  return {
    id: r.id,
    name: r.name,
    startsAt: r.starts_at.toISOString(),
    venue: r.venue,
    speaker: r.speaker,
    status: r.status,
    acceptingQuestions: r.accepting_questions,
    moderation: r.moderation,
    hidden: r.hidden,
    ...(r.image ? { image: r.image } : {}),
    ...(r.youtube_id ? { youtubeId: r.youtube_id } : {}),
  };
}

/**
 * One event. Hidden events are excluded **by default**, so a public path that forgets to think
 * about visibility gets null and 404s rather than leaking. Admin callers pass `includeHidden`
 * deliberately; that opt-in is the only way to read a hidden majelis.
 */
export async function getEvent(id: string, { includeHidden = false } = {}) {
  const row = await one<EventRow>(
    `select ${EVENT_COLS} from events e where e.id = $1 and ($2 or not e.hidden)`,
    [id, includeHidden],
  );
  return row && toEvent(row);
}

/**
 * The session list, with the count of what's publicly visible on each.
 *
 * Ordered so the row a jamaah came for is first: whatever is running, else the next session to
 * start, then everything else newest-first. `lead` marks that first row when it is one of those
 * two, so the page can single it out without doing date arithmetic during render — "now" is the
 * database's, evaluated once per request, and React's purity rule keeps it out of a component.
 *
 * The old `starts_at desc` alone led with the session furthest in the future, which is the one
 * nobody is looking for.
 */
export async function listEvents() {
  const rows = await query<EventRow & { question_count: string; lead: boolean }>(
    `select ${EVENT_COLS},
            (select count(*) from questions q
              where q.event_id = e.id and q.status = 'approved') as question_count,
            (e.status = 'live'
              or (e.status = 'scheduled' and e.starts_at >= now())) as lead
       from events e
      where not e.hidden
      order by case when e.status = 'live' then 0
                    when e.status = 'scheduled' and e.starts_at >= now() then 1
                    else 2 end,
               -- Soonest first among sessions still to come; newest first in the archive.
               case when e.status = 'scheduled' and e.starts_at >= now()
                    then e.starts_at end asc,
               e.starts_at desc`,
  );
  return rows.map((r) => ({
    ...toEvent(r),
    questionCount: Number(r.question_count),
    lead: r.lead,
  }));
}

// --- rate limiting -----------------------------------------------------------------------
//
// Two counters, and the split matters. A majelis puts hundreds of phones behind one mosque
// wifi NAT, so they share a single address; an IP limit tight enough to stop one spammer would
// lock out the whole room. The real per-person limit is on the browser token; the IP counter is
// only a backstop against a script, set loose enough that a shared NAT never trips it.
//
// ponytail: counts rows in `questions`, so it only limits successful inserts; a flood of
// rejects isn't throttled. Add a proper counter table if that ever shows up in the logs.
export const PER_ASKER = { max: 3, minutes: 10 };
export const PER_IP = { max: 60, minutes: 10 };

/** Returns a user-facing message when the caller has hit a limit, null otherwise. */
export async function rateLimited(token: string, hash: string) {
  const row = await one<{ by_asker: string; by_ip: string }>(
    `select
       count(*) filter (where asker_token = $1
                          and created_at > now() - make_interval(mins => $3::int)) as by_asker,
       count(*) filter (where ip_hash = $2
                          and created_at > now() - make_interval(mins => $4::int)) as by_ip
     from questions
     where created_at > now() - make_interval(mins => greatest($3::int, $4::int))`,
    [token, hash, PER_ASKER.minutes, PER_IP.minutes],
  );
  if (!row) return null;
  if (Number(row.by_asker) >= PER_ASKER.max)
    return `Anda baru saja mengirim pertanyaan. Coba lagi beberapa menit lagi.`;
  if (Number(row.by_ip) >= PER_IP.max) return `Terlalu banyak pertanyaan dari jaringan ini.`;
  return null;
}

/**
 * One page of questions, oldest first, keyset-paged on (created_at, id).
 *
 * `askerToken` widens the window by exactly one thing: the caller's own questions awaiting
 * review become visible to them and nobody else. Without that a student who submits into a
 * moderation queue sees nothing, assumes it failed, and submits again.
 *
 * `includeAll` is the admin view and is only ever passed from an authenticated path.
 */
export async function fetchPage(
  eventId: string,
  cursor: string | null,
  askerToken: string | null,
  { includeAll = false, includeHidden = false, limit = PAGE_SIZE } = {},
): Promise<Page> {
  const visible = includeAll
    ? "true"
    : `(q.status = 'approved' or (q.status = 'submitted' and q.asker_token = $3))`;

  // A hidden event's questions are unreachable through this path too, not just through its page.
  // The server action is the trust boundary; a 404 on the route alone would still leave the
  // questions readable to anyone who knew the event id. Admin callers opt in, as with getEvent.
  const reachable = includeHidden
    ? "true"
    : `exists (select 1 from events e where e.id = q.event_id and not e.hidden)`;

  const rows = await query<QuestionRow>(
    `select ${PUBLIC_COLS.replace("$TOKEN", "$3")}
       from questions q
      where q.event_id = $1
        and ${visible}
        and ${reachable}
        and ($2::uuid is null or (q.created_at, q.id) >
             (select c.created_at, c.id from questions c where c.id = $2::uuid))
      order by q.created_at, q.id
      limit $4`,
    [eventId, cursor, askerToken, limit + 1],
  );

  // Fetch one extra to learn whether another page exists, rather than advertising a cursor that
  // turns out to be empty.
  const items = rows.slice(0, limit).map(toQuestion);
  return { items, nextCursor: rows.length > limit ? items[items.length - 1].id : null };
}

/**
 * Whether this admin may work on this majelis: they hold a grant on it, or they are the
 * superadmin (`adminId === null`, which every predicate here reads as "no filter").
 *
 * A predicate rather than a field on `Event`, deliberately. Event crosses to the browser on the
 * public page, and who staffs a majelis has no business going with it — the same reason
 * `contact` and `ip_hash` are not in PUBLIC_COLS.
 *
 * Access is not the same as authority: this says an admin may open the session, not that they
 * may edit or answer it. What a grant actually permits is in lib/actions.ts.
 */
export async function canWorkOn(eventId: string, adminId: string | null) {
  if (adminId === null) return true; // superadmin
  const row = await one<{ ok: boolean }>(
    `select exists (select 1 from event_admins where event_id = $1 and user_id = $2) as ok`,
    [eventId, adminId],
  );
  return row?.ok === true;
}

/** The same question asked from a question id, for the actions that only carry one. */
export async function canWorkOnQuestion(questionId: string, adminId: string | null) {
  if (adminId === null) return true;
  const row = await one<{ ok: boolean }>(
    `select exists (select 1 from event_admins a join questions q on q.event_id = a.event_id
                     where q.id = $1::uuid and a.user_id = $2) as ok`,
    [questionId, adminId],
  );
  return row?.ok === true;
}

/** The admins staffing one majelis. Superadmins are not listed: they are on every session. */
export async function eventAdmins(eventId: string) {
  const rows = await query<{ user_id: string }>(
    `select user_id from event_admins where event_id = $1`,
    [eventId],
  );
  return rows.map((r) => r.user_id);
}

/** The majelis one admin is staffing, for the per-account view of the same grants. */
export async function adminEventIds(userId: string) {
  const rows = await query<{ event_id: string }>(
    `select event_id from event_admins where user_id = $1`,
    [userId],
  );
  return rows.map((r) => r.event_id);
}

/**
 * The admin session list, with the counts an operator actually triages on.
 *
 * `adminId` is the signed-in admin, and `null` means a superadmin: no filter, every majelis.
 * Passing the id is not optional anywhere — an admin sees only the sessions they are staffing.
 */
export async function listEventsForAdmin(adminId: string | null) {
  const rows = await query<EventRow & { total: string; pending: string; unanswered: string }>(
    `select ${EVENT_COLS},
            count(q.id)                                       as total,
            count(q.id) filter (where q.status = 'submitted')  as pending,
            count(q.id) filter (where q.answer is null
                                  and q.status <> 'hidden')    as unanswered
       from events e
       left join questions q on q.event_id = e.id
      where ($1::text is null
             or exists (select 1 from event_admins a
                         where a.event_id = e.id and a.user_id = $1))
      group by e.id
      order by
        -- Live sessions first: during a dauroh that is the only row anyone wants.
        case e.status when 'live' then 0 when 'scheduled' then 1 else 2 end,
        e.starts_at desc`,
    [adminId],
  );
  return rows.map((r) => ({
    ...toEvent(r),
    total: Number(r.total),
    pending: Number(r.pending),
    unanswered: Number(r.unanswered),
  }));
}

/** A single question, mapped. Used by the admin write paths to return fresh state. */
export async function getQuestion(id: string) {
  const row = await one<QuestionRow>(
    `select ${PUBLIC_COLS.replace("$TOKEN", "null")} from questions q where q.id = $1::uuid`,
    [id],
  );
  return row && toQuestion(row);
}

/** Admin board: every question on the event. No paging; sessions run 2–50 questions. */
export async function listAllQuestions(eventId: string) {
  const rows = await query<QuestionRow>(
    `select ${PUBLIC_COLS.replace("$TOKEN", "null")}
       from questions q where q.event_id = $1 order by q.created_at, q.id`,
    [eventId],
  );
  return rows.map(toQuestion);
}

/** How many questions an event carries, for the delete confirmation to state what it destroys. */
export async function countQuestions(eventId: string) {
  const row = await one<{ n: string }>(
    `select count(*) as n from questions where event_id = $1`,
    [eventId],
  );
  return Number(row?.n ?? 0);
}

/**
 * Every version an answer has ever had, newest first. Admin only, and deliberately not part of
 * PUBLIC_COLS: the public is told an answer was edited, never what it previously said. A wrong
 * ruling withdrawn from display must not stay readable through a side door. See ROADMAP.md §3.
 */
export async function listRevisions(questionId: string): Promise<Revision[]> {
  const rows = await query<{
    answer: string | null;
    retracted: boolean;
    edited_by: string | null;
    created_at: Date;
  }>(
    `select answer, retracted, edited_by, created_at
       from answer_revisions
      where question_id = $1::uuid
      order by created_at desc, id desc`,
    [questionId],
  );
  return rows.map((r) => ({
    answer: r.answer,
    retracted: r.retracted,
    editedBy: r.edited_by,
    createdAt: r.created_at.toISOString(),
  }));
}

/**
 * Everything this browser has ever asked, newest first, across every event.
 *
 * Hidden questions are included here and nowhere else. This used to filter them out, which
 * recreated the exact failure ROADMAP.md §3 keeps a *pending* question visible to its asker to
 * avoid: a question that silently vanishes reads as a question that failed to send, and the
 * student asks it again. Their own question stays on their own list, marked for what it is.
 *
 * `event_hidden` rides along so the page can stop linking to a majelis the public cannot open.
 */
export async function listMine(askerToken: string) {
  const rows = await query<QuestionRow & { event_name: string; event_hidden: boolean }>(
    `select ${PUBLIC_COLS.replace("$TOKEN", "$1")}, e.name as event_name, e.hidden as event_hidden
       from questions q join events e on e.id = q.event_id
      where q.asker_token = $1
      order by q.created_at desc
      limit 100`,
    [askerToken],
  );
  return rows.map((r) => ({
    ...toQuestion(r),
    eventName: r.event_name,
    eventHidden: r.event_hidden,
  }));
}
