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

const EVENT_COLS = `
  id, name, starts_at, venue, speaker, status,
  coalesce(accepting_questions, status = 'live') as accepting_questions,
  moderation, public_archive, image, youtube_id
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
  const row = await one<EventRow>(`select ${EVENT_COLS} from events where id = $1`, [id]);
  return row && toEvent(row);
}

/** The session list, with the count of what's publicly visible on each. */
export async function listEvents() {
  const rows = await query<EventRow & { question_count: string }>(
    `select ${EVENT_COLS},
            (select count(*) from questions q
              where q.event_id = events.id and q.status = 'approved') as question_count
       from events
      order by starts_at desc`,
  );
  return rows.map((r) => ({ ...toEvent(r), questionCount: Number(r.question_count) }));
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
