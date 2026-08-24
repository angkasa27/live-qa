// Load the demo data into a fresh database. Idempotent: re-running replaces the seeded rows and
// leaves anything submitted through the app alone (seeded ids are prefixed, real ones are uuids).
//
//   npm run db:seed
import { readFileSync } from "node:fs";
import { Pool } from "pg";
import { events, questions } from "./seed-data.ts";

for (const line of readFileSync(new URL("../.env.local", import.meta.url), "utf8").split("\n")) {
  const m = /^([A-Z_]+)=(.*)$/.exec(line.trim());
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

await pool.query("begin");
try {
  for (const e of events) {
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

  // Seeded questions are wiped and rewritten wholesale; they carry no asker_token, so they can
  // never be mistaken for something a real student submitted.
  await pool.query(`delete from questions where asker_token is null and ip_hash is null`);

  for (const q of questions) {
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
