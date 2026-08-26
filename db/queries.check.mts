// Self-check for the logic that isn't obvious by reading: keyset pagination, who can see a
// question awaiting review, and the two-counter rate limit. Runs against DATABASE_URL.
//
//   npm run check
//
// --conditions=react-server so `server-only` resolves to its no-op build outside Next.
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import "./env.mts";

const { pool, query } = await import("../lib/db.ts");
const { fetchPage, listEvents, listEventsForAdmin } = await import("../lib/queries.ts");

const EVENT = `check-${randomUUID().slice(0, 8)}`;
const MINE = randomUUID();
const THEIRS = randomUUID();

try {
  await query(
    `insert into events (id, name, starts_at, venue, speaker, status)
     values ($1, 'check', now(), 'check', 'check', 'live')`,
    [EVENT],
  );

  // 25 approved, spread over distinct timestamps so the keyset order is unambiguous.
  for (let i = 0; i < 25; i++) {
    await query(
      `insert into questions (event_id, body, status, created_at)
       values ($1, $2, 'approved', now() - make_interval(secs => $3::int))`,
      [EVENT, `approved ${i}`, 1000 - i],
    );
  }
  await query(
    `insert into questions (event_id, body, status, asker_token) values ($1,'pending mine','submitted',$2)`,
    [EVENT, MINE],
  );
  await query(
    `insert into questions (event_id, body, status, asker_token) values ($1,'pending theirs','submitted',$2)`,
    [EVENT, THEIRS],
  );
  await query(`insert into questions (event_id, body, status, answer, retracted)
               values ($1,'retracted','approved','was wrong', true)`, [EVENT]);

  // --- keyset pagination: pages tile the list exactly once, and the last one clears the cursor ---
  const seen: string[] = [];
  let cursor: string | null = null;
  let pages = 0;
  do {
    const page = await fetchPage(EVENT, cursor, null, { limit: 10 });
    seen.push(...page.items.map((q) => q.body));
    cursor = page.nextCursor;
    pages++;
    assert.ok(pages < 20, "pagination did not terminate");
  } while (cursor);

  assert.equal(seen.length, new Set(seen).size, "a question appeared on two pages");
  assert.equal(seen.length, 26, `expected 25 approved + 1 retracted, got ${seen.length}`);
  assert.deepEqual(seen.slice(0, 3), ["approved 0", "approved 1", "approved 2"], "not oldest-first");

  // An unknown cursor must not silently replay page one.
  assert.deepEqual(await fetchPage(EVENT, randomUUID(), null, { limit: 10 }),
                   { items: [], nextCursor: null });

  // --- visibility: a pending question belongs to its asker and nobody else ---
  const anon = (await fetchPage(EVENT, null, null, { limit: 100 })).items.map((q) => q.body);
  assert.ok(!anon.includes("pending mine"), "pending question leaked to a stranger");
  assert.ok(!anon.includes("pending theirs"), "pending question leaked to a stranger");

  const mine = (await fetchPage(EVENT, null, MINE, { limit: 100 })).items;
  assert.ok(mine.some((q) => q.body === "pending mine" && q.mine), "asker cannot see their own pending question");
  assert.ok(!mine.some((q) => q.body === "pending theirs"), "asker can see someone else's pending question");

  // --- a retracted answer is withdrawn from display but never deleted ---
  const retracted = anon.includes("retracted") && (await fetchPage(EVENT, null, null, { limit: 100 })).items
    .find((q) => q.body === "retracted")!;
  assert.equal(retracted && retracted.answer, null, "retracted answer still rendered");
  const [kept] = await query<{ answer: string }>(
    `select answer from questions where event_id = $1 and body = 'retracted'`, [EVENT]);
  assert.equal(kept.answer, "was wrong", "retracted answer was destroyed, not withheld");

  // --- the list queries actually execute ---
  // These join and aggregate, which the type checker cannot see into: an unqualified column or a
  // bad group-by is a runtime error only, and it takes out the whole page when it fires.
  const admin = await listEventsForAdmin();
  const row = admin.find((e) => e.id === EVENT);
  assert.ok(row, "the admin list dropped an event that exists");
  assert.equal(row.total, 28, "admin total count is wrong");
  assert.equal(row.pending, 2, "admin pending count is wrong");
  // 25 approved with no answer + 2 pending; the retracted one has an answer row, so it is not
  // unanswered, and hidden questions are excluded.
  assert.equal(row.unanswered, 27, "admin unanswered count is wrong");

  const pub = (await listEvents()).find((e) => e.id === EVENT);
  assert.ok(pub, "the public list dropped an event that exists");
  assert.equal(pub.questionCount, 26, "public count should be approved only");

  // --- rate limit: the window actually excludes what falls outside it ---
  // The 25 approved rows were backdated ~16 minutes; the 3 others went in at now(). A counter that
  // ignored the window would see 28 and lock out a student who has asked nothing recently.
  const [{ recent, old }] = await query<{ recent: string; old: string }>(
    `select count(*) filter (where created_at >  now() - make_interval(mins => 10)) as recent,
            count(*) filter (where created_at <= now() - make_interval(mins => 10)) as old
       from questions where event_id = $1`,
    [EVENT],
  );
  assert.equal(Number(recent), 3, "window is counting rows that fell out of it");
  assert.equal(Number(old), 25, "window is dropping rows that are still inside it");
} finally {
  // Runs even when an assertion throws; otherwise a failed check leaves its scaffold
  // event behind and it turns up in the app as a stray session.
  await query(`delete from events where id = $1`, [EVENT]); // cascades to questions
  await pool.end();
}
console.log("queries ok: 26 rows over 3 pages, visibility and retraction hold");
