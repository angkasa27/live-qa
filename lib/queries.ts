import "server-only";
import { query, one } from "./db.ts";
import type { Event, Page, Question, QuestionStatus } from "./types.ts";
import { PAGE_SIZE } from "./types.ts";

// Columns that may cross to the browser. `contact`, `asker_token` and `ip_hash` are deliberately
// not in this list and must never be added to it — see ROADMAP.md §3, "Anonymity is display, not
// identity". `mine` is computed per-request from the caller's own token.
const PUBLIC_COLS = `
  q.id, q.event_id, q.body, q.status, q.answer, q.retracted, q.author,
  q.created_at, q.source, q.video_start,
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
    ...(r.mine ? { mine: true } : {}),
  };
}

// Always qualified with the `e` alias: the admin list joins questions, and an unqualified `id`
// is ambiguous the moment it does. Every reader below selects `from events e`.
const EVENT_COLS = `
  e.id, e.name, e.starts_at, e.venue, e.speaker, e.status,
  coalesce(e.accepting_questions, e.status = 'live') as accepting_questions,
  e.moderation, e.public_archive, e.image, e.youtube_id
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
  public_archive: boolean;
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
    publicArchive: r.public_archive,
    ...(r.image ? { image: r.image } : {}),
    ...(r.youtube_id ? { youtubeId: r.youtube_id } : {}),
  };
}

export async function getEvent(id: string) {
  const row = await one<EventRow>(`select ${EVENT_COLS} from events e where e.id = $1`, [id]);
  return row && toEvent(row);
}

/** The session list, with the count of what's publicly visible on each. */
export async function listEvents() {
  const rows = await query<EventRow & { question_count: string }>(
    `select ${EVENT_COLS},
            (select count(*) from questions q
              where q.event_id = e.id and q.status = 'approved') as question_count
       from events e
      order by e.starts_at desc`,
  );
  return rows.map((r) => ({ ...toEvent(r), questionCount: Number(r.question_count) }));
}

// --- rate limiting -----------------------------------------------------------------------
//
// Two counters, and the split matters. A majelis puts hundreds of phones behind one mosque
// wifi NAT, so they share a single address — an IP limit tight enough to stop one spammer would
// lock out the whole room. The real per-person limit is on the browser token; the IP counter is
// only a backstop against a script, set loose enough that a shared NAT never trips it.
//
// ponytail: counts rows in `questions`, so it only limits successful inserts — a flood of
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
  { includeAll = false, limit = PAGE_SIZE } = {},
): Promise<Page> {
  const visible = includeAll
    ? "true"
    : `(q.status = 'approved' or (q.status = 'submitted' and q.asker_token = $3))`;

  const rows = await query<QuestionRow>(
    `select ${PUBLIC_COLS.replace("$TOKEN", "$3")}
       from questions q
      where q.event_id = $1
        and ${visible}
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

/** The admin session list: every event, with the counts an operator actually triages on. */
export async function listEventsForAdmin() {
  const rows = await query<EventRow & { total: string; pending: string; unanswered: string }>(
    `select ${EVENT_COLS},
            count(q.id)                                       as total,
            count(q.id) filter (where q.status = 'submitted')  as pending,
            count(q.id) filter (where q.answer is null
                                  and q.status <> 'hidden')    as unanswered
       from events e
       left join questions q on q.event_id = e.id
      group by e.id
      order by
        -- Live sessions first: during a dauroh that is the only row anyone wants.
        case e.status when 'live' then 0 when 'scheduled' then 1 else 2 end,
        e.starts_at desc`,
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

/** Admin board: every question on the event. No paging — sessions run 2–50 questions. */
export async function listAllQuestions(eventId: string) {
  const rows = await query<QuestionRow>(
    `select ${PUBLIC_COLS.replace("$TOKEN", "null")}
       from questions q where q.event_id = $1 order by q.created_at, q.id`,
    [eventId],
  );
  return rows.map(toQuestion);
}

/** Everything this browser has ever asked, newest first, across every event. */
export async function listMine(askerToken: string) {
  const rows = await query<QuestionRow & { event_name: string }>(
    `select ${PUBLIC_COLS.replace("$TOKEN", "$1")}, e.name as event_name
       from questions q join events e on e.id = q.event_id
      where q.asker_token = $1 and q.status <> 'hidden'
      order by q.created_at desc
      limit 100`,
    [askerToken],
  );
  return rows.map((r) => ({ ...toQuestion(r), eventName: r.event_name }));
}
