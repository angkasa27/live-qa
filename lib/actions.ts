"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { auth, isSuperadmin } from "./auth.ts";
import { one, query } from "./db.ts";
import { askerToken, ensureAskerToken, ipHash } from "./asker.ts";
import { draftFromVideo } from "./gemini.ts";
import {
  fetchPage as readPage,
  getEvent,
  getQuestion,
  listAllQuestions,
  listEventsForAdmin,
  listRevisions,
  canWorkOn,
  canWorkOnQuestion,
  rateLimited,
} from "./queries.ts";
import {
  MAX_BODY,
  parseVideoId,
  slugify,
  type EventStatus,
  type Page,
  type Proposal,
  type Question,
  type QuestionStatus,
  type Revision,
} from "./types.ts";

export type Result<T = void> = { ok: true; data: T } | { ok: false; error: string };

const fail = (error: string): Result<never> => ({ ok: false, error });
const done = <T>(data: T): Result<T> => ({ ok: true, data });

async function requireAdmin() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) throw new Error("Unauthorized");
  return session.user;
}

/** `null` is the superadmin: every grant predicate reads it as "no filter". */
const scope = (user: { id: string }) => (isSuperadmin(user) ? null : user.id);

/**
 * Two different questions, and the whole authorization model is the gap between them.
 *
 * `requireEventAccess` asks whether this admin may *work on* the majelis: they hold a grant, or
 * they are the superadmin. That buys the room — moderating what comes in, moving the session
 * between terjadwal/live/arsip, opening and closing submissions, the speaker deck.
 *
 * `requireOwner` asks whether they may *change what the majelis is*: create it, rewrite its
 * details, hide it, delete it, answer in the speaker's name. Only the superadmin, always. An
 * answer published under a scholar's name is the thing this app is shaped around (ROADMAP §3),
 * and it is not something a grant hands out.
 *
 * Both throw like requireAdmin does, so the failure mode is the one callers already handle.
 */
async function requireEventAccess(eventId: string) {
  const user = await requireAdmin();
  if (!(await canWorkOn(eventId, scope(user)))) throw new Error("Unauthorized");
  return user;
}

async function requireQuestionAccess(questionId: string) {
  const user = await requireAdmin();
  if (!(await canWorkOnQuestion(questionId, scope(user)))) throw new Error("Unauthorized");
  return user;
}

/** Superadmin, full stop. */
async function requireOwner() {
  const user = await requireAdmin();
  if (!isSuperadmin(user)) throw new Error("Unauthorized");
  return user;
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
  // this; these two exist to give a usable message, not to be the boundary.
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
 * The speaker deck. Approved only, deliberately NOT widened by the caller's own asker token
 * the way fetchPage is. The tablet on stage may well have submitted a question itself (an admin
 * testing the form, or the syaikh asking something), and a question awaiting review must never
 * reach the screen the room is looking at. That is the entire point of moderation.
 */
export async function fetchApproved(eventId: string, cursor: string | null): Promise<Page> {
  await requireEventAccess(eventId);
  return readPage(eventId, cursor, null, { includeHidden: true });
}

// --- admin --------------------------------------------------------------------------------

export async function adminList(eventId: string): Promise<Question[]> {
  await requireEventAccess(eventId);
  return listAllQuestions(eventId);
}

/**
 * Publishes directly and keeps every prior version. Empty string retracts.
 *
 * `videoStart` rides along rather than being written when a draft is generated: queries.ts
 * returns it whatever the answer is, so setting it early would put a ▶ replay control on a
 * question nobody has answered yet.
 */
export async function setAnswer(
  id: string,
  answer: string,
  videoStart?: number,
): Promise<Result<Question>> {
  const user = await requireOwner();
  const text = answer.trim();
  const retracted = text.length === 0;
  const anchor = !retracted && Number.isInteger(videoStart) && videoStart! >= 0 ? videoStart! : null;

  const row = await one<{ id: string }>(
    `update questions
        set answer = $2, retracted = $3, answered_at = case when $3 then answered_at else now() end,
            video_start = coalesce($4, video_start)
      where id = $1::uuid
      returning id`,
    [id, text || null, retracted, anchor],
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
  await requireQuestionAccess(id);
  const row = await one<{ id: string }>(
    `update questions set status = $2 where id = $1::uuid returning id`,
    [id, status],
  );
  return row ? done(undefined) : fail("Pertanyaan tidak ditemukan.");
}

/**
 * Propose answers for this event's outstanding questions from its own recording. One call per
 * press carrying the whole list, not one per question: the video is the expensive part and its
 * cost is fixed, and a model that sees the questions together can tell when the speaker took two
 * of them at once.
 *
 * An empty result is a success. The speaker gets through what time allows, so most of the queue
 * going unmatched is the ordinary outcome, not a failure.
 */
export async function draftAnswers(eventId: string): Promise<Result<Record<string, Proposal>>> {
  await requireOwner();

  const event = await getEvent(eventId, { includeHidden: true });
  if (!event) return fail("Majelis tidak ditemukan.");
  if (!event.youtubeId) return fail("Majelis ini belum punya rekaman YouTube.");

  const pending = (await listAllQuestions(eventId)).filter(
    (q) => !q.answer && q.status !== "hidden",
  );
  if (pending.length === 0) return fail("Tidak ada pertanyaan yang belum dijawab.");

  try {
    const proposals = await draftFromVideo(
      event.youtubeId,
      pending.map((q) => ({ id: q.id, body: q.body })),
    );
    return done(Object.fromEntries(proposals.map((p) => [p.id, p])));
  } catch (err) {
    return fail(err instanceof Error ? err.message : "Gagal membaca rekaman.");
  }
}

export async function adminEvents() {
  const user = await requireAdmin();
  return listEventsForAdmin(scope(user));
}

const STATUSES: EventStatus[] = ["scheduled", "live", "archived"];

/** The descriptive fields, as the two forms send them. Status and moderation are not here. */
export type EventDetails = {
  name: string;
  startsAt: string;
  venue: string;
  speaker: string;
  video?: string;
  image?: string;
  /**
   * The address the majelis lives at, which is also its primary key. Absent means "derive it
   * from the name" on create and "leave it alone" on edit; whatever arrives is run through
   * slugify() rather than rejected, so an admin who types spaces or capitals gets the URL they
   * meant instead of a validation error.
   */
  slug?: string;
};

type CleanDetails = {
  name: string;
  startsAt: string;
  venue: string;
  speaker: string;
  youtubeId: string | null;
  image: string | null;
  slug: string | null;
};

/**
 * Trims and checks what both createEvent and updateEvent write. One copy, because a rule that
 * holds on create and not on edit is not a rule. The DB has its own CHECKs under this; these
 * exist to give a usable Indonesian message.
 */
function validateDetails(input: EventDetails): Result<CleanDetails> {
  const name = input.name.trim();
  const venue = input.venue.trim();
  const speaker = input.speaker.trim();
  if (!name) return fail("Nama majelis wajib diisi.");
  if (!venue) return fail("Tempat wajib diisi.");
  if (!speaker) return fail("Nama pemateri wajib diisi.");
  if (Number.isNaN(Date.parse(input.startsAt))) return fail("Waktu mulai tidak valid.");

  const video = input.video?.trim();
  const youtubeId = video ? parseVideoId(video) : null;
  if (video && !youtubeId) return fail("Tautan YouTube tidak dikenali.");

  const asked = input.slug?.trim();
  const slug = asked ? slugify(asked) : null;
  if (asked && !slug) return fail("Alamat sesi hanya boleh huruf, angka dan tanda hubung.");

  return done({
    name,
    startsAt: input.startsAt,
    venue,
    speaker,
    youtubeId,
    image: input.image?.trim() || null,
    slug,
  });
}

/**
 * `acceptingQuestions: null` hands the decision back to the status (open only while live).
 * true/false pin it either way; that's what keeps an archived session taking questions when
 * the organiser wants that. Undefined means "don't touch".
 */
export async function updateEvent(
  eventId: string,
  patch: {
    status?: EventStatus;
    acceptingQuestions?: boolean | null;
    moderation?: "auto" | "manual";
    hidden?: boolean;
    /**
     * The edit form's fields, all of them, every time. Absent means "leave the details alone",
     * which is what the settings panel sends. Present and empty means clear: an admin removing
     * a wrong YouTube link has to be able to end up with no link at all.
     */
    details?: EventDetails;
  },
): Promise<Result<{ id: string }>> {
  const user = await requireEventAccess(eventId);
  // What a grant covers is the session's *running*: its state, whether it takes questions, and
  // whether they queue for review. What it is — name, address, time, venue, speaker, recording,
  // cover — and whether the public can see it at all stay with the superadmin. Checked here
  // rather than by hiding the fields: the form is a convenience, this is the boundary.
  if (!isSuperadmin(user) && (patch.details || "hidden" in patch)) {
    throw new Error("Unauthorized");
  }
  if (patch.status && !STATUSES.includes(patch.status)) return fail("Status tidak dikenal.");

  let clean: CleanDetails | null = null;
  if (patch.details) {
    const checked = validateDetails(patch.details);
    if (!checked.ok) return checked;
    clean = checked.data;
  }

  // The id is the slug, and it is in every shared link, so it moves only when an admin asks for
  // it by name — a rename of the majelis leaves it alone. questions.event_id follows through
  // `on update cascade` (db/schema.sql); what does not follow is a link somebody already sent,
  // which is why the UI says so before the save.
  let row: { id: string } | null;
  try {
    row = await one<{ id: string }>(
      `update events set
       id                  = coalesce($14, id),
       status              = coalesce($2, status),
       accepting_questions = case when $3 then $4 else accepting_questions end,
       moderation          = coalesce($5, moderation),
       hidden              = coalesce($6, hidden),
       name                = coalesce($8, name),
       starts_at           = coalesce($9::timestamptz, starts_at),
       venue               = coalesce($10, venue),
       speaker             = coalesce($11, speaker),
       -- Gated rather than coalesced: null here means "clear it", not "keep it".
       youtube_id          = case when $7 then $12 else youtube_id end,
       image               = case when $7 then $13 else image end
     where id = $1
     returning id`,
      [
        eventId,
        patch.status ?? null,
        "acceptingQuestions" in patch,
        patch.acceptingQuestions ?? null,
        patch.moderation ?? null,
        patch.hidden ?? null,
        clean !== null,
        clean?.name ?? null,
        clean?.startsAt ?? null,
        clean?.venue ?? null,
        clean?.speaker ?? null,
        clean?.youtubeId ?? null,
        clean?.image ?? null,
        clean?.slug ?? null,
      ],
    );
  } catch (e) {
    // The primary key is the only unique thing on the table, so this can only be the slug.
    if ((e as { code?: string }).code === "23505") return fail("Alamat sesi itu sudah dipakai.");
    throw e;
  }
  if (!row) return fail("Sesi tidak ditemukan.");
  revalidatePath("/admin");
  revalidatePath(`/events/${eventId}`);
  if (row.id !== eventId) revalidatePath(`/events/${row.id}`);
  revalidatePath("/"); // name and cover feed the public list
  return done({ id: row.id });
}

/**
 * Removes a majelis and everything hanging off it. `questions.event_id` cascades, and
 * `answer_revisions.question_id` cascades off questions, so this one statement is the whole
 * delete.
 *
 * This is the one place in the app that destroys anything. ROADMAP.md §3's "nothing is ever
 * deleted" is a rule about *answers*: a published ruling gets retracted, never erased. An event
 * created by mistake is a different thing, and the alternative to a delete is an organiser
 * staring at a test majelis forever. The confirmation lives in the UI, not here.
 */
export async function deleteEvent(eventId: string): Promise<Result> {
  await requireOwner();
  const row = await one<{ id: string }>(`delete from events where id = $1 returning id`, [eventId]);
  if (!row) return fail("Sesi tidak ditemukan.");
  revalidatePath("/admin");
  revalidatePath("/");
  return done(undefined);
}

/** Every version an answer has had. Admin only; this never reaches a student's browser. */
export async function answerHistory(questionId: string): Promise<Revision[]> {
  await requireQuestionAccess(questionId);
  return listRevisions(questionId);
}

export async function createEvent(
  input: EventDetails & { status: EventStatus; moderation: "auto" | "manual" },
): Promise<Result<{ id: string }>> {
  const user = await requireOwner();

  if (!STATUSES.includes(input.status)) return fail("Status tidak dikenal.");
  const checked = validateDetails(input);
  if (!checked.ok) return checked;
  const { name, venue, speaker, youtubeId, image, slug } = checked.data;

  const base = slug || slugify(name) || "majelis";
  // A name-derived id gets a suffix on collision: two majelis can legitimately share a name
  // across terms and the organiser can do nothing about it. An id the admin typed out is
  // different — silently handing back a different address than the one they chose is worse
  // than saying it is taken.
  let rows: { id: string }[];
  try {
    rows = await query<{ id: string }>(
      `insert into events (id, name, starts_at, venue, speaker, status, moderation, youtube_id, image, created_by)
     select case when $11 or not exists (select 1 from events where id = $1)
                 then $1
                 else $1 || '-' || substr(md5(random()::text), 1, 4) end,
            $2, $3, $4, $5, $6, $7, $8, $9, $10
     returning id`,
      [base, name, input.startsAt, venue, speaker, input.status, input.moderation,
       youtubeId, image, user.id, slug !== null],
    );
  } catch (e) {
    if ((e as { code?: string }).code === "23505") return fail("Alamat sesi itu sudah dipakai.");
    throw e;
  }

  revalidatePath("/admin");
  revalidatePath("/");
  return done({ id: rows[0].id });
}
