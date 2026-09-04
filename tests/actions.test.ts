import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { randomUUID } from "node:crypto";
import { baseUrl } from "./dburl.ts";

// The server actions are the trust boundary, so they get tested end to end: real database,
// real validation logic; only the Next runtime seams (headers/cookies/auth/revalidate) are
// stubbed. The signed-in admin session is faked as always present.
const jar = new Map<string, string>();

vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (k: string) => (jar.has(k) ? { value: jar.get(k) } : undefined),
    set: (k: string, v: string) => void jar.set(k, v),
  }),
  headers: async () => new Headers({ "x-forwarded-for": "203.0.113.9" }),
}));
vi.mock("next/cache", () => ({ revalidatePath: () => {} }));

// Who is signed in, and mutable: ownership is the one thing these actions decide differently
// for a superadmin and a plain admin, so the suite has to be able to be either. Default is the
// superadmin, which is what every test written before ownership existed assumes.
const who = vi.hoisted(() => ({ user: { id: "admin-1", role: "superadmin" } }));
vi.mock("../lib/auth.ts", () => ({
  auth: { api: { getSession: async () => ({ user: who.user }) } },
  isSuperadmin: (u: { role?: string }) => u.role === "superadmin",
}));

/** Signs the suite in as somebody else for one test. */
function signedInAs(id: string, role: "superadmin" | "admin") {
  who.user = { id, role };
}

const { addQuestion, adminEvents, adminList, answerHistory, createEvent, deleteEvent,
        draftAnswers, fetchApproved, fetchPage, setAnswer, setQuestionStatus,
        updateEvent } = await import("../lib/actions.ts");
const { pool, query } = await import("../lib/db.ts");
const { getEvent, listEvents, listMine } = await import("../lib/queries.ts");
import { MAX_BODY } from "../lib/types.ts";

async function seedEvent(
  patch: Partial<{ status: string; moderation: string; hidden: boolean; owner: string }> = {},
) {
  const id = `act-${randomUUID().slice(0, 8)}`;
  await query(
    `insert into events (id, name, starts_at, venue, speaker, status, moderation, hidden, created_by)
     values ($1, 'test event', now(), 'test venue', 'test speaker', $2, $3, $4, $5)`,
    [id, patch.status ?? "live", patch.moderation ?? "auto", patch.hidden ?? false,
     patch.owner ?? null],
  );
  return id;
}

const suite = baseUrl() ? describe : describe.skip;

/** Unwraps the failure branch so tests can match on the user-facing message. */
function errorOf(r: { ok: true } | { ok: false; error: string }): string {
  return r.ok ? "" : r.error;
}

suite("actions (integration)", () => {
  beforeEach(async () => {
    await query(`truncate events, questions, answer_revisions, event_admins cascade`);
    jar.clear();
    signedInAs("admin-1", "superadmin");
  });

  afterAll(async () => {
    await pool.end();
  });

  describe("addQuestion", () => {
    const input = (over: Partial<Parameters<typeof addQuestion>[0]> = {}) => ({
      eventId: "nope",
      body: "a question",
      author: null,
      ...over,
    });

    it("rejects empty and oversized bodies with a usable message", async () => {
      expect(errorOf(await addQuestion(input({ body: "   " })))).toMatch(/Tulis pertanyaan/);
      expect((await addQuestion(input({ body: "x".repeat(MAX_BODY + 1) })))).toEqual({
        ok: false,
        error: `Maksimal ${MAX_BODY} karakter.`,
      });
    });

    it("rejects an invalid email contact", async () => {
      expect(errorOf(await addQuestion(input({ contact: "not-an-email" })))).toMatch(/email tidak valid/);
    });

    it("rejects unknown and closed sessions", async () => {
      expect(errorOf(await addQuestion(input()))).toMatch(/tidak ditemukan/);

      const closed = await seedEvent({ status: "archived" });
      expect(errorOf(await addQuestion(input({ eventId: closed })))).toMatch(/tidak menerima pertanyaan/);
    });

    it("lands as approved under auto moderation, submitted under manual", async () => {
      for (const moderation of ["auto", "manual"] as const) {
        jar.clear();
        const eventId = await seedEvent({ moderation });
        const result = await addQuestion(input({ eventId }));
        expect(result.ok).toBe(true);
        if (!result.ok) continue;
        expect(result.data.status).toBe(moderation === "auto" ? "approved" : "submitted");
        expect(result.data.mine).toBe(true);
      }
    });

    it("trims the body and stores the author only when given", async () => {
      const eventId = await seedEvent();
      const anon = await addQuestion(input({ eventId, body: "  spaced  ", author: null }));
      expect(anon.ok && anon.data.body).toBe("spaced");
      expect(anon.ok && anon.data.author).toBeNull();

      const named = await addQuestion(
        input({ eventId, body: "named", author: "  Umar  ", contact: "umar@example.com" }),
      );
      expect(named.ok && named.data.author).toBe("Umar");
    });

    it("lets three quick asks through, then trips the per-asker limit", async () => {
      const eventId = await seedEvent();
      const results = [];
      for (let i = 0; i < 4; i++) results.push(await addQuestion(input({ eventId })));

      for (const r of results.slice(0, 3)) expect(r.ok).toBe(true);
      const fourth = results[3];
      expect(fourth.ok === false && /Anda baru saja/.test(fourth.error)).toBe(true);
    });
  });

  describe("setAnswer", () => {
    async function pending() {
      const eventId = await seedEvent();
      const [row] = await query<{ id: string }>(
        `insert into questions (event_id, body) values ($1, 'why?') returning id`,
        [eventId],
      );
      return row.id;
    }

    it("publishes an answer and keeps a revision", async () => {
      const id = await pending();

      const result = await setAnswer(id, "  because.  ");
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.data.answer).toBe("because.");
      expect(result.data.retracted).toBe(false);

      const [rev] = await query<{ answer: string }>(
        `select answer from answer_revisions where question_id = $1::uuid`,
        [id],
      );
      expect(rev.answer).toBe("because.");
    });

    it("retracts on empty text: hidden from display, kept in row and revisions", async () => {
      const id = await pending();
      await setAnswer(id, "first answer");
      const retracted = await setAnswer(id, "");
      expect(retracted.ok && retracted.data.retracted).toBe(true);

      const [row] = await query<{ answer: string | null }>(
        `select answer from questions where id = $1::uuid`,
        [id],
      );
      expect(row.answer).toBeNull(); // display mapping reads this as withheld

      const revs = await query<{ answer: string | null; retracted: boolean }>(
        `select answer, retracted from answer_revisions where question_id = $1::uuid order by id`,
        [id],
      );
      expect(revs).toEqual([
        { answer: "first answer", retracted: false },
        { answer: null, retracted: true },
      ]);
    });

    it("fails cleanly on an unknown question", async () => {
      expect((await setAnswer(randomUUID(), "x")).ok).toBe(false);
    });
  });

  describe("updateEvent", () => {
    it("rejects an unknown status without touching the row", async () => {
      const eventId = await seedEvent();
      const result = await updateEvent(eventId, { status: "exploded" as never });
      expect(result.ok).toBe(false);
      expect((await getEvent(eventId))?.status).toBe("live");
    });

    it(`pins acceptingQuestions independently of status`, async () => {
      const eventId = await seedEvent({ status: "archived" });
      expect((await getEvent(eventId))?.acceptingQuestions).toBe(false);

      expect((await updateEvent(eventId, { acceptingQuestions: true })).ok).toBe(true);
      expect((await getEvent(eventId))?.acceptingQuestions).toBe(true);

      // A later status change must not unpin it.
      expect((await updateEvent(eventId, { status: "live" })).ok).toBe(true);
      expect((await getEvent(eventId))?.acceptingQuestions).toBe(true);
    });

    it("leaves fields alone when the patch omits them", async () => {
      const eventId = await seedEvent({ status: "live", moderation: "auto" });
      await updateEvent(eventId, { hidden: true });
      // getEvent hides these by default, so an admin read is the only way to see the row.
      const e = await getEvent(eventId, { includeHidden: true });
      expect(e?.status).toBe("live");
      expect(e?.moderation).toBe("auto");
      expect(e?.hidden).toBe(true);
    });

    it("fails on an unknown session", async () => {
      expect((await updateEvent("ghost", { status: "live" })).ok).toBe(false);
    });

    const details = (over: Partial<NonNullable<Parameters<typeof updateEvent>[1]["details"]>> = {}) => ({
      name: "Nama Baru",
      startsAt: "2026-10-01T02:00:00Z",
      venue: "Masjid Baru",
      speaker: "Syaikh Baru",
      ...over,
    });

    it("rewrites the details without moving the id", async () => {
      const eventId = await seedEvent();
      expect((await updateEvent(eventId, { details: details() })).ok).toBe(true);

      // The id is the slug and it is in every shared link; renaming must not break them.
      const e = await getEvent(eventId);
      expect(e?.id).toBe(eventId);
      expect(e?.name).toBe("Nama Baru");
      expect(e?.venue).toBe("Masjid Baru");
      expect(e?.speaker).toBe("Syaikh Baru");
      expect(e?.startsAt).toBe("2026-10-01T02:00:00.000Z");
    });

    it("moves the id when a new slug is asked for, and takes the questions with it", async () => {
      const eventId = await seedEvent();
      await addQuestion({ eventId, body: "ikut pindah", author: null });

      const res = await updateEvent(eventId, { details: details({ slug: "Alamat Baru!" }) });
      expect(res).toEqual({ ok: true, data: { id: "alamat-baru" } });

      expect(await getEvent(eventId)).toBe(null);
      expect((await getEvent("alamat-baru"))?.name).toBe("Nama Baru");
      // on update cascade, or the rename would have been refused by the foreign key.
      const rows = await query(`select event_id from questions`);
      expect(rows).toEqual([{ event_id: "alamat-baru" }]);
    });

    it("refuses a slug another majelis already holds", async () => {
      const taken = await seedEvent();
      const eventId = await seedEvent();
      expect(errorOf(await updateEvent(eventId, { details: details({ slug: taken }) })))
        .toMatch(/sudah dipakai/);
      expect((await getEvent(eventId))?.id).toBe(eventId);
    });

    it("sets and then clears the youtube link", async () => {
      const eventId = await seedEvent();
      await updateEvent(eventId, { details: details({ video: "https://youtu.be/dQw4w9WgXcQ" }) });
      expect((await getEvent(eventId))?.youtubeId).toBe("dQw4w9WgXcQ");

      // An empty field is an instruction to clear, not an absent one to ignore.
      await updateEvent(eventId, { details: details({ video: "" }) });
      expect((await getEvent(eventId))?.youtubeId).toBeUndefined();
    });

    it("applies the same validation createEvent does", async () => {
      const eventId = await seedEvent();
      expect(errorOf(await updateEvent(eventId, { details: details({ name: " " }) }))).toMatch(/Nama majelis/);
      expect(errorOf(await updateEvent(eventId, { details: details({ venue: "" }) }))).toMatch(/Tempat/);
      expect(errorOf(await updateEvent(eventId, { details: details({ speaker: " " }) }))).toMatch(/pemateri/);
      expect(errorOf(await updateEvent(eventId, { details: details({ startsAt: "besok" }) }))).toMatch(/Waktu mulai/);
      expect(errorOf(await updateEvent(eventId, { details: details({ video: "nope" }) }))).toMatch(/YouTube/);
      // A rejected patch must not have written anything.
      expect((await getEvent(eventId))?.name).toBe("test event");
    });

    it("leaves the details alone when the patch is settings only", async () => {
      const eventId = await seedEvent();
      await updateEvent(eventId, { details: details({ video: "https://youtu.be/dQw4w9WgXcQ" }) });
      await updateEvent(eventId, { status: "archived" });

      const e = await getEvent(eventId);
      expect(e?.name).toBe("Nama Baru");
      expect(e?.youtubeId).toBe("dQw4w9WgXcQ");
    });
  });

  describe("hidden events", () => {
    it("are unreachable through every public read, and reachable for admins", async () => {
      const eventId = await seedEvent({ hidden: true });

      // The default is closed: a public path that forgets about visibility gets null and 404s.
      expect(await getEvent(eventId)).toBeNull();
      expect((await listEvents()).some((e) => e.id === eventId)).toBe(false);
      expect((await getEvent(eventId, { includeHidden: true }))?.hidden).toBe(true);
    });

    it("refuse new questions even though the action is public", async () => {
      const eventId = await seedEvent({ hidden: true, status: "live" });
      const res = await addQuestion({ eventId, body: "should not land", author: null });
      expect(res.ok).toBe(false);

      const rows = await query(`select 1 from questions where event_id = $1`, [eventId]);
      expect(rows).toHaveLength(0);
    });

    it("keep their questions out of the public page but not the speaker deck", async () => {
      // Seed visible so the question can be submitted, then hide the majelis afterwards.
      const eventId = await seedEvent();
      const q = await addQuestion({ eventId, body: "asked before hiding", author: null });
      expect(q.ok).toBe(true);
      await updateEvent(eventId, { hidden: true });

      // The route would 404, but the server action is the trust boundary that has to hold.
      expect((await fetchPage(eventId, null)).items).toHaveLength(0);
      // The deck is behind requireAdmin and still runs the session.
      expect((await fetchApproved(eventId, null)).items).toHaveLength(1);
    });

    it("still show the asker their own question, without a link to a dead page", async () => {
      const eventId = await seedEvent();
      const q = await addQuestion({ eventId, body: "mine", author: null });
      if (!q.ok) throw new Error(q.error);
      await updateEvent(eventId, { hidden: true });

      const token = jar.get("ask_asker")!;
      const mine = await listMine(token);
      expect(mine).toHaveLength(1);
      expect(mine[0].eventHidden).toBe(true);
    });
  });

  describe("listMine", () => {
    it("keeps a hidden question on its asker's own list", async () => {
      const eventId = await seedEvent();
      const q = await addQuestion({ eventId, body: "will be rejected", author: null });
      if (!q.ok) throw new Error(q.error);
      await query(`update questions set status = 'hidden' where id = $1::uuid`, [q.data.id]);

      // Filtering these out made a rejected question read as one that failed to send, so the
      // student asked it again. See ROADMAP.md §3 and lib/queries.ts.
      const token = jar.get("ask_asker")!;
      const mine = await listMine(token);
      expect(mine).toHaveLength(1);
      expect(mine[0].status).toBe("hidden");

      // Still absent from what everyone else can read.
      expect((await fetchPage(eventId, null)).items).toHaveLength(0);
    });
  });

  describe("deleteEvent", () => {
    it("takes the questions and their revisions with it", async () => {
      const eventId = await seedEvent();
      const q = await addQuestion({ eventId, body: "gone soon", author: null });
      expect(q.ok).toBe(true);
      if (q.ok) await setAnswer(q.data.id, "an answer");

      expect((await deleteEvent(eventId)).ok).toBe(true);
      expect(await getEvent(eventId)).toBeNull();
      // questions cascades off events, and answer_revisions cascades off questions.
      const left = await query(`select 1 from questions where event_id = $1`, [eventId]);
      expect(left).toHaveLength(0);
      expect(await query(`select 1 from answer_revisions`)).toHaveLength(0);
    });

    it("fails on an unknown session", async () => {
      expect((await deleteEvent("ghost")).ok).toBe(false);
    });
  });

  describe("edited", () => {
    it("is set by a second save and not the first", async () => {
      const eventId = await seedEvent();
      const q = await addQuestion({ eventId, body: "q", author: null });
      if (!q.ok) throw new Error(q.error);

      const first = await setAnswer(q.data.id, "first answer");
      expect(first.ok && first.data.edited).toBeUndefined();

      const second = await setAnswer(q.data.id, "corrected answer");
      expect(second.ok && second.data.edited).toBe(true);

      // The history is the record; the flag is all the public side gets.
      expect(await answerHistory(q.data.id)).toMatchObject([
        { answer: "corrected answer" },
        { answer: "first answer" },
      ]);
    });
  });

  describe("createEvent", () => {
    const input = (over: Partial<Parameters<typeof createEvent>[0]> = {}) => ({
      name: "Kajian Ahad Pagi",
      startsAt: "2026-09-06T02:00:00Z",
      venue: "Masjid",
      speaker: "Syaikh",
      status: "scheduled" as const,
      moderation: "auto" as const,
      ...over,
    });

    it("creates with a slugged id and parses the youtube link", async () => {
      const result = await createEvent(input({
        video: "https://youtu.be/dQw4w9WgXcQ?t=30",
      }));
      expect(result).toEqual({ ok: true, data: { id: "kajian-ahad-pagi" } });
      expect((await getEvent("kajian-ahad-pagi"))?.youtubeId).toBe("dQw4w9WgXcQ");
    });

    it("rejects missing fields, bad dates and unknown youtube links", async () => {
      expect(errorOf(await createEvent(input({ name: "  " })))).toMatch(/Nama majelis/);
      expect(errorOf(await createEvent(input({ venue: "" })))).toMatch(/Tempat/);
      expect(errorOf(await createEvent(input({ speaker: " " })))).toMatch(/pemateri/);
      expect(errorOf(await createEvent(input({ startsAt: "next friday" })))).toMatch(/Waktu mulai/);
      expect(errorOf(await createEvent(input({ video: "not-a-link" })))).toMatch(/YouTube/);
    });

    it("takes the id from an explicit slug rather than the name", async () => {
      const result = await createEvent(input({ slug: "Kajian Malam Rabu" }));
      expect(result).toEqual({ ok: true, data: { id: "kajian-malam-rabu" } });
    });

    it("refuses a chosen slug that is taken instead of quietly suffixing it", async () => {
      await createEvent(input({ slug: "bentrok" }));
      expect(errorOf(await createEvent(input({ slug: "bentrok" })))).toMatch(/sudah dipakai/);
    });

    it("survives an id collision by suffixing instead of failing", async () => {
      const first = await createEvent(input());
      const again = await createEvent(input());
      expect(first).toEqual({ ok: true, data: { id: "kajian-ahad-pagi" } });
      expect(again.ok).toBe(true);
      if (again.ok) expect(again.data.id.startsWith("kajian-ahad-pagi-")).toBe(true);
    });
  });

  // --- access and authority -------------------------------------------------------------
  //
  // Two different questions, and the gap between them is the whole model. A grant hands an
  // admin the room: moderate the queue, move the session, open and close it. It does not hand
  // them what the session *is* — its details, its visibility, its answers — which stays with
  // the superadmin. Every action is checked rather than a representative sample: a boundary is
  // only as good as the action that forgot to call it.
  describe("access", () => {
    const STAFF = "admin-staff";
    const OTHER = "admin-other";

    /** A majelis with one question, staffed by STAFF, signed in as STAFF. */
    async function seedStaffed(who: string = STAFF) {
      const eventId = await seedEvent();
      await query(`insert into event_admins (event_id, user_id) values ($1, $2)`, [eventId, STAFF]);
      const [q] = await query<{ id: string }>(
        `insert into questions (event_id, body) values ($1, 'a question') returning id`,
        [eventId],
      );
      signedInAs(who, "admin");
      return { eventId, questionId: q.id };
    }

    it("hides a majelis nobody granted them from every action that names one", async () => {
      const { eventId } = await seedStaffed(OTHER);
      await expect(adminList(eventId)).rejects.toThrow(/Unauthorized/);
      await expect(fetchApproved(eventId, null)).rejects.toThrow(/Unauthorized/);
      await expect(updateEvent(eventId, { status: "archived" })).rejects.toThrow(/Unauthorized/);
      expect((await getEvent(eventId))?.status).toBe("live");
    });

    it("hides its questions too", async () => {
      const { questionId } = await seedStaffed(OTHER);
      await expect(setQuestionStatus(questionId, "hidden")).rejects.toThrow(/Unauthorized/);
      await expect(answerHistory(questionId)).rejects.toThrow(/Unauthorized/);
    });

    it("lets a staffed admin run the session: moderate, move it, open and close it", async () => {
      const { eventId, questionId } = await seedStaffed();

      expect((await adminList(eventId)).length).toBe(1);
      expect((await setQuestionStatus(questionId, "hidden")).ok).toBe(true);
      expect((await updateEvent(eventId, { status: "archived" })).ok).toBe(true);
      expect((await updateEvent(eventId, { acceptingQuestions: true })).ok).toBe(true);
      expect((await updateEvent(eventId, { moderation: "manual" })).ok).toBe(true);

      const e = await getEvent(eventId);
      expect(e?.status).toBe("archived");
      expect(e?.acceptingQuestions).toBe(true);
      expect(e?.moderation).toBe("manual");
      expect(await answerHistory(questionId)).toEqual([]);
    });

    it("refuses a staffed admin the things a grant does not cover", async () => {
      const { eventId, questionId } = await seedStaffed();

      // Answering in the speaker's name, and taking an answer back.
      await expect(setAnswer(questionId, "jawaban")).rejects.toThrow(/Unauthorized/);
      await expect(draftAnswers(eventId)).rejects.toThrow(/Unauthorized/);
      // Rewriting what the majelis is, and whether the public can see it.
      await expect(
        updateEvent(eventId, {
          details: {
            name: "Diganti", startsAt: new Date().toISOString(),
            venue: "v", speaker: "s",
          },
        }),
      ).rejects.toThrow(/Unauthorized/);
      await expect(updateEvent(eventId, { hidden: true })).rejects.toThrow(/Unauthorized/);
      // Starting one, and destroying one.
      await expect(
        createEvent({
          name: "Baru", startsAt: new Date().toISOString(), venue: "v", speaker: "s",
          status: "scheduled", moderation: "auto",
        }),
      ).rejects.toThrow(/Unauthorized/);
      await expect(deleteEvent(eventId)).rejects.toThrow(/Unauthorized/);

      const e = await getEvent(eventId, { includeHidden: true });
      expect(e?.name).toBe("test event");
      expect(e?.hidden).toBe(false);
      const [row] = await query<{ answer: string | null }>(
        `select answer from questions where id = $1::uuid`, [questionId]);
      expect(row.answer).toBeNull();
    });

    it("lists only staffed majelis to an admin, and everything to a superadmin", async () => {
      const { eventId: staffed } = await seedStaffed();
      const unstaffed = await seedEvent();

      expect((await adminEvents()).map((e) => e.id)).toEqual([staffed]);

      signedInAs("admin-1", "superadmin");
      expect((await adminEvents()).map((e) => e.id).sort()).toEqual([staffed, unstaffed].sort());
    });

    it("refuses a majelis that does not exist the same way it refuses an unstaffed one", async () => {
      signedInAs(STAFF, "admin");
      await expect(updateEvent("ghost", { status: "live" })).rejects.toThrow(/Unauthorized/);
    });

    it("revoking a grant closes the door again", async () => {
      const { eventId } = await seedStaffed();
      expect((await adminList(eventId)).length).toBe(1);

      await query(`delete from event_admins where event_id = $1 and user_id = $2`, [eventId, STAFF]);
      await expect(adminList(eventId)).rejects.toThrow(/Unauthorized/);
    });
  });
});
