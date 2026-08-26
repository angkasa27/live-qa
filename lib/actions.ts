"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { auth } from "./auth.ts";
import { one, query } from "./db.ts";
import { askerToken, ensureAskerToken, ipHash } from "./asker.ts";
import {
  fetchPage as readPage,
  getEvent,
  getQuestion,
  listAllQuestions,
  listEventsForAdmin,
  rateLimited,
} from "./queries.ts";
import {
  MAX_BODY,
  parseVideoId,
  slugify,
  type EventStatus,
  type Page,
  type Question,
  type QuestionStatus,
} from "./types.ts";

export type Result<T = void> = { ok: true; data: T } | { ok: false; error: string };

const fail = (error: string): Result<never> => ({ ok: false, error });
const done = <T>(data: T): Result<T> => ({ ok: true, data });

async function requireAdmin() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) throw new Error("Unauthorized");
  return session.user;
}

// --- student ------------------------------------------------------------------------------

export async function addQuestion(input: {
  eventId: string;
  body: string;
  author: string | null;
  contact?: string | null;
}): Promise<Result<Question>> {
  const body = input.body.trim();

  // The same rules SubmitForm shows, enforced where it counts. The DB has its own CHECK under
  // this — these two exist to give a usable message, not to be the boundary.
  if (!body) return fail("Tulis pertanyaan Anda dulu.");
  if (body.length > MAX_BODY) return fail(`Maksimal ${MAX_BODY} karakter.`);

  const contact = input.contact?.trim() || null;
  if (contact && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(contact)) return fail("Alamat email tidak valid.");

  const event = await getEvent(input.eventId);
  if (!event) return fail("Sesi tidak ditemukan.");
  if (!event.acceptingQuestions) return fail("Sesi ini sedang tidak menerima pertanyaan.");

  const token = await ensureAskerToken();
  const hash = await ipHash();
  const limited = await rateLimited(token, hash);
  if (limited) return fail(limited);

  const author = input.author?.trim() || null;
  const status: QuestionStatus = event.moderation === "manual" ? "submitted" : "approved";

  const [row] = await query<{ id: string; created_at: Date }>(
    `insert into questions
       (event_id, body, status, is_anonymous, author, contact, asker_token, ip_hash)
     values ($1, $2, $3, $4, $5, $6, $7, $8)
     returning id, created_at`,
    [input.eventId, body, status, author === null, author, contact, token, hash],
  );

  return done({
    id: row.id,
    eventId: input.eventId,
    body,
    status,
    answer: null,
    retracted: false,
    author,
    createdAt: row.created_at.toISOString(),
    mine: true,
  });
}

export async function fetchPage(eventId: string, cursor: string | null): Promise<Page> {
  return readPage(eventId, cursor, await askerToken());
}

/**
 * The speaker deck. Approved only — deliberately NOT widened by the caller's own asker token
 * the way fetchPage is. The tablet on stage may well have submitted a question itself (an admin
 * testing the form, or the syaikh asking something), and a question awaiting review must never
 * reach the screen the room is looking at. That is the entire point of moderation.
 */
export async function fetchApproved(eventId: string, cursor: string | null): Promise<Page> {
  await requireAdmin();
  return readPage(eventId, cursor, null);
}

// --- admin --------------------------------------------------------------------------------

export async function adminList(eventId: string): Promise<Question[]> {
  await requireAdmin();
  return listAllQuestions(eventId);
}

/** Publishes directly and keeps every prior version. Empty string retracts. */
export async function setAnswer(id: string, answer: string): Promise<Result<Question>> {
  const user = await requireAdmin();
  const text = answer.trim();
  const retracted = text.length === 0;

  const row = await one<{ id: string }>(
    `update questions
        set answer = $2, retracted = $3, answered_at = case when $3 then answered_at else now() end
      where id = $1::uuid
      returning id`,
    [id, text || null, retracted],
  );
  if (!row) return fail("Pertanyaan tidak ditemukan.");

  await query(
    `insert into answer_revisions (question_id, answer, retracted, edited_by)
     values ($1::uuid, $2, $3, $4)`,
    [id, text || null, retracted, user.id],
  );

  const updated = await getQuestion(id);
  return updated ? done(updated) : fail("Pertanyaan tidak ditemukan.");
}

export async function setQuestionStatus(id: string, status: QuestionStatus): Promise<Result> {
  await requireAdmin();
  const row = await one<{ id: string }>(
    `update questions set status = $2 where id = $1::uuid returning id`,
    [id, status],
  );
  return row ? done(undefined) : fail("Pertanyaan tidak ditemukan.");
}

export async function adminEvents() {
  await requireAdmin();
  return listEventsForAdmin();
}

const STATUSES: EventStatus[] = ["scheduled", "live", "archived"];

/**
 * `acceptingQuestions: null` hands the decision back to the status (open only while live).
 * true/false pin it either way — that's what keeps an archived session taking questions when
 * the organiser wants that. Undefined means "don't touch".
 */
export async function updateEvent(
  eventId: string,
  patch: {
    status?: EventStatus;
    acceptingQuestions?: boolean | null;
    moderation?: "auto" | "manual";
    publicArchive?: boolean;
  },
): Promise<Result> {
  await requireAdmin();
  if (patch.status && !STATUSES.includes(patch.status)) return fail("Status tidak dikenal.");

  const row = await one<{ id: string }>(
    `update events set
       status              = coalesce($2, status),
       accepting_questions = case when $3 then $4 else accepting_questions end,
       moderation          = coalesce($5, moderation),
       public_archive      = coalesce($6, public_archive)
     where id = $1
     returning id`,
    [
      eventId,
      patch.status ?? null,
      "acceptingQuestions" in patch,
      patch.acceptingQuestions ?? null,
      patch.moderation ?? null,
      patch.publicArchive ?? null,
    ],
  );
  if (!row) return fail("Sesi tidak ditemukan.");
  revalidatePath("/admin");
  revalidatePath(`/events/${eventId}`);
  return done(undefined);
}

export async function createEvent(input: {
  name: string;
  startsAt: string;
  venue: string;
  speaker: string;
  status: EventStatus;
  moderation: "auto" | "manual";
  video?: string;
  image?: string;
}): Promise<Result<{ id: string }>> {
  const user = await requireAdmin();

  const name = input.name.trim();
  const venue = input.venue.trim();
  const speaker = input.speaker.trim();
  if (!name) return fail("Nama majelis wajib diisi.");
  if (!venue) return fail("Tempat wajib diisi.");
  if (!speaker) return fail("Nama pemateri wajib diisi.");
  if (!STATUSES.includes(input.status)) return fail("Status tidak dikenal.");
  if (Number.isNaN(Date.parse(input.startsAt))) return fail("Waktu mulai tidak valid.");

  const video = input.video?.trim();
  const youtubeId = video ? parseVideoId(video) : null;
  if (video && !youtubeId) return fail("Tautan YouTube tidak dikenali.");

  const base = slugify(name) || "majelis";
  // Two majelis can legitimately share a name across terms, so the id gets a suffix rather than
  // the creation failing on a collision the organiser can do nothing about.
  const [{ id }] = await query<{ id: string }>(
    `insert into events (id, name, starts_at, venue, speaker, status, moderation, youtube_id, image, created_by)
     select case when exists (select 1 from events where id = $1)
                 then $1 || '-' || substr(md5(random()::text), 1, 4)
                 else $1 end,
            $2, $3, $4, $5, $6, $7, $8, $9, $10
     returning id`,
    [base, name, input.startsAt, venue, speaker, input.status, input.moderation,
     youtubeId, input.image?.trim() || null, user.id],
  );

  revalidatePath("/admin");
  revalidatePath("/");
  return done({ id });
}
