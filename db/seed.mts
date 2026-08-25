// Load the demo data into a fresh database. Idempotent: re-running replaces the seeded rows and
// leaves anything submitted through the app alone (real questions carry an asker_token).
//
//   npm run db:seed                        everything
//   npm run db:seed -- --status archived   only the two real recorded majelis
//
// The filter exists because the live/scheduled seed events are fictional demo data, and a real
// deployment wants the archived recordings without "DevFest Jakarta 2026" alongside them.
import "./env.mts";
import { Pool } from "pg";
import { events, questions } from "./seed-data.ts";

const flag = process.argv.indexOf("--status");
const only = flag === -1 ? null : process.argv[flag + 1];
if (flag !== -1 && !["scheduled", "live", "archived"].includes(only ?? "")) {
  console.error("--status must be one of: scheduled, live, archived");
  process.exit(1);
}

const wanted = only ? events.filter((e) => e.status === only) : events;
const wantedIds = new Set(wanted.map((e) => e.id));
const wantedQuestions = questions.filter((q) => wantedIds.has(q.eventId));

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

await pool.query("begin");
try {
  for (const e of wanted) {
    await pool.query(
      `insert into events (id, name, starts_at, venue, speaker, status, moderation, public_archive, image, youtube_id)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
       on conflict (id) do update set
         name = excluded.name, starts_at = excluded.starts_at, venue = excluded.venue,
         speaker = excluded.speaker, status = excluded.status, moderation = excluded.moderation,
         public_archive = excluded.public_archive, image = excluded.image,
         youtube_id = excluded.youtube_id`,
      [e.id, e.name, e.startsAt, e.venue, e.speaker, e.status, e.moderation ?? "auto",
       e.publicArchive ?? false, e.image ?? null, e.youtubeId ?? null],
    );
  }

  // Seeded questions are rewritten wholesale, but only for the events being seeded — a filtered
  // run must not clear another event's rows. Anything a real student submitted carries an
  // asker_token and is never touched.
  await pool.query(
    `delete from questions
      where event_id = any($1) and asker_token is null and ip_hash is null`,
    [[...wantedIds]],
  );

  for (const q of wantedQuestions) {
    await pool.query(
      `insert into questions (event_id, body, status, answer, answered_at, is_anonymous, author, source, video_start, created_at)
       values ($1,$2,'approved',$3,$4,$5,$6,$7,$8,$9)`,
      [q.eventId, q.body, q.answer, q.answer ? q.createdAt : null, q.author === null,
       q.author, q.source ?? null, q.videoStart ?? null, q.createdAt],
    );
  }

  await pool.query("commit");
} catch (err) {
  await pool.query("rollback");
  throw err;
}

const { rows } = await pool.query(
  `select e.status, count(distinct e.id) as events, count(q.id) as questions
     from events e left join questions q on q.event_id = e.id group by e.status order by 1`,
);
console.table(rows);
await pool.end();
