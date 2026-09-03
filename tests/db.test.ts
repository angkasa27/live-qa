import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { pool, query } from "../lib/db.ts";
import {
  fetchPage,
  getEvent,
  getQuestion,
  listAllQuestions,
  listEvents,
  listEventsForAdmin,
  listMine,
  PER_ASKER,
  PER_IP,
  rateLimited,
} from "../lib/queries.ts";
import { baseUrl } from "./dburl.ts";

// Skipped as a whole when there is no database configured — unit tests still run.
const suite = baseUrl() ? describe : describe.skip;

let eventSeq = 0;

async function seedEvent(patch: Partial<{
  status: string;
  acceptingQuestions: boolean | null;
}> = {}) {
  const id = `t${++eventSeq}-${randomUUID().slice(0, 8)}`;
  await query(
    `insert into events (id, name, starts_at, venue, speaker, status, accepting_questions)
     values ($1, 'test event', now(), 'test venue', 'test speaker', $2, $3)`,
    [id, patch.status ?? "live", patch.acceptingQuestions ?? null],
  );
  return id;
}

type QOpts = {
  status?: "submitted" | "approved" | "hidden";
  token?: string | null;
  hash?: string | null;
  contact?: string | null;
  ageSec?: number;
  answer?: string | null;
  retracted?: boolean;
};

async function seedQ(eventId: string, body: string, o: QOpts = {}) {
  const [row] = await query<{ id: string }>(
    `insert into questions
       (event_id, body, status, asker_token, ip_hash, contact, created_at, answer, retracted)
     values ($1, $2, $3, $4, $5, $6, now() - make_interval(secs => $7::int), $8, $9)
     returning id`,
    [
      eventId,
      body,
      o.status ?? "approved",
      o.token ?? null,
      o.hash ?? null,
      o.contact ?? null,
      o.ageSec ?? 0,
      o.answer ?? null,
      o.retracted ?? false,
    ],
  );
  return row.id;
}

suite("queries (integration)", () => {
  beforeEach(async () => {
    await query(`truncate events, questions, answer_revisions cascade`);
  });

  afterAll(async () => {
    await pool.end();
  });

  describe("fetchPage — keyset pagination", () => {
    it("tiles every approved question exactly once, oldest first", async () => {
      const eventId = await seedEvent();
      for (let i = 0; i < 25; i++) {
        await seedQ(eventId, `q ${String(i).padStart(2, "0")}`, { ageSec: 1000 - i });
      }

      const seen: string[] = [];
      let cursor: string | null = null;
      let pages = 0;
      do {
        const page = await fetchPage(eventId, cursor, null);
        seen.push(...page.items.map((q) => q.body));
        cursor = page.nextCursor;
        pages++;
        expect(pages).toBeLessThan(20); // must terminate
      } while (cursor);

      expect(pages).toBe(3);
      expect(seen.length).toBe(new Set(seen).size);
      expect(seen.slice(0, 3)).toEqual(["q 00", "q 01", "q 02"]);
      expect(seen.at(-1)).toBe("q 24");
    });

    it("returns an empty page for an unknown cursor instead of replaying page one", async () => {
      const eventId = await seedEvent();
      await seedQ(eventId, "only");
      expect(await fetchPage(eventId, randomUUID(), null)).toEqual({ items: [], nextCursor: null });
    });
  });

  describe("fetchPage — visibility of pending questions", () => {
    it("shows a submitted question only to the asker who sent it", async () => {
      const eventId = await seedEvent({ status: "scheduled" });
      await seedQ(eventId, "pending mine", { status: "submitted", token: "tok-mine" });
      await seedQ(eventId, "pending theirs", { status: "submitted", token: "tok-theirs" });
      await seedQ(eventId, "approved one");

      const anon = (await fetchPage(eventId, null, null)).items.map((q) => q.body);
      expect(anon).toEqual(["approved one"]);

      const mine = (await fetchPage(eventId, null, "tok-mine")).items;
      const own = mine.find((q) => q.body === "pending mine");
      expect(own?.mine).toBe(true);
      expect(mine.map((q) => q.body)).not.toContain("pending theirs");
    });

    it("never leaks pending questions even to another asker's own-token view", async () => {
      const eventId = await seedEvent({ status: "scheduled" });
      await seedQ(eventId, "pending theirs", { status: "submitted", token: "tok-theirs" });
      const items = (await fetchPage(eventId, null, "tok-mine")).items;
      expect(items.filter((q) => q.status === "submitted")).toHaveLength(0);
    });

    it("includeAll is the admin window and sees everything", async () => {
      const eventId = await seedEvent();
      await seedQ(eventId, "pending", { status: "submitted", token: "t" });
      await seedQ(eventId, "hidden", { status: "hidden" });
      const bodies = (await fetchPage(eventId, null, null, { includeAll: true })).items
        .map((q) => q.body);
      expect(bodies).toContain("pending");
      expect(bodies).toContain("hidden");
    });
  });

  it("never serialises contact, asker token or ip hash to the client shape", async () => {
    const eventId = await seedEvent();
    await seedQ(eventId, "secret-ish", {
      token: "tok",
      hash: "hash",
      contact: "student@example.com",
    });

    const page = await fetchPage(eventId, null, "tok");
    const admin = await listAllQuestions(eventId);
    const single = await getQuestion(await seedQ(eventId, "second"));

    for (const q of [...page.items, ...admin]) {
      expect(q).not.toHaveProperty("contact");
      expect(q).not.toHaveProperty("askerToken");
      expect(q).not.toHaveProperty("ipHash");
      expect(JSON.stringify(q)).not.toContain("student@example.com");
    }
    expect(single).not.toHaveProperty("ipHash");
  });

  describe("retraction", () => {
    it("withholds a retracted answer from display but keeps it in the row", async () => {
      const eventId = await seedEvent();
      const id = await seedQ(eventId, "retracted", {
        answer: "was wrong",
        retracted: true,
      });

      expect((await getQuestion(id))?.answer).toBeNull();

      const [kept] = await query<{ answer: string }>(
        `select answer from questions where id = $1::uuid`,
        [id],
      );
      expect(kept.answer).toBe("was wrong");
    });
  });

  describe("getEvent — accepting_questions resolution", () => {
    it("follows status unless pinned", async () => {
      const live = await seedEvent({ status: "live" });
      const archived = await seedEvent({ status: "archived" });
      const pinned = await seedEvent({ status: "archived", acceptingQuestions: true });

      expect((await getEvent(live))?.acceptingQuestions).toBe(true);
      expect((await getEvent(archived))?.acceptingQuestions).toBe(false);
      expect((await getEvent(pinned))?.acceptingQuestions).toBe(true);
    });
  });

  describe("admin and public counts", () => {
    it("counts what an operator triages on", async () => {
      const eventId = await seedEvent();
      await seedQ(eventId, "a1", { ageSec: 100 });
      await seedQ(eventId, "a2", { ageSec: 100 });
      await seedQ(eventId, "p1", { status: "submitted", token: "t" });
      await seedQ(eventId, "h1", { status: "hidden", answer: "x" });
      await seedQ(eventId, "r1", { answer: "was wrong", retracted: true });

      const row = (await listEventsForAdmin(null)).find((e) => e.id === eventId)!;
      expect(row.total).toBe(5);
      expect(row.pending).toBe(1);
      // hidden has an answer so not unanswered; retracted keeps its answer row; only a1/a2/p1 count.
      expect(row.unanswered).toBe(3);

      const pub = (await listEvents()).find((e) => e.id === eventId)!;
      expect(pub.questionCount).toBe(3); // approved only, hidden excluded
    });
  });

  describe("listMine", () => {
    it("spans events, marks mine, newest first, and keeps hidden ones", async () => {
      const older = await seedEvent();
      const newer = await seedEvent();
      await seedQ(older, "old mine", { token: "me", ageSec: 100 });
      await seedQ(newer, "new mine", { token: "me" });
      await seedQ(newer, "hidden mine", { token: "me", status: "hidden" });
      await seedQ(newer, "someone else", { token: "them" });

      // This list used to drop hidden questions, which made a rejected question read as one
      // that never sent, so the student asked it again. Their own stays on their own list; it
      // is still absent from every other read. See lib/queries.ts.
      const mine = await listMine("me");
      expect(mine.map((q) => q.body)).toEqual(["hidden mine", "new mine", "old mine"]);
      expect(mine.every((q) => q.mine)).toBe(true);
      expect(mine.find((q) => q.body === "hidden mine")?.status).toBe("hidden");
      expect(mine[0].eventName).toBe("test event");
    });
  });

  describe("rateLimited — two counters", () => {
    it(`trips at ${PER_ASKER.max} recent questions for one token`, async () => {
      const eventId = await seedEvent();
      for (let i = 0; i < PER_ASKER.max; i++) {
        expect(await rateLimited("tok", "hash-a")).toBeNull();
        await seedQ(eventId, `x ${i}`, { token: "tok", hash: "hash-a" });
      }
      expect(await rateLimited("tok", "hash-a")).toMatch(/Anda baru saja/);
    });

    it("forgets questions that fell out of the window", async () => {
      const eventId = await seedEvent();
      await seedQ(eventId, "old", { token: "tok", ageSec: (PER_ASKER.minutes + 1) * 60 });
      await seedQ(eventId, "recent", { token: "tok" });
      expect(await rateLimited("tok", "hash")).toBeNull();
    });

    it(`trips at ${PER_IP.max} recent questions from one address across tokens`, async () => {
      const eventId = await seedEvent();
      for (let i = 0; i < PER_IP.max - 1; i++) {
        await seedQ(eventId, `n ${i}`, { token: `tok-${i}`, hash: "busy-nat" });
      }
      expect(await rateLimited("fresh-tok", "busy-nat")).toBeNull();
      await seedQ(eventId, "the last straw", { token: "tok-final", hash: "busy-nat" });
      expect(await rateLimited("fresh-tok", "busy-nat")).toMatch(/jaringan ini/);
      expect(await rateLimited("fresh-tok", "other-address")).toBeNull();
    });
  });
});
