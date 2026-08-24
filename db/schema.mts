// Apply db/schema.sql. Goes through `pg` rather than shelling out to psql: psql isn't always on
// PATH, and `psql $DATABASE_URL` with the variable unset connects to whatever default database
// the local socket offers and creates the whole schema there instead of failing.
//
//   npm run db:schema
import "./env.mts";
import { readFileSync } from "node:fs";
import { Pool } from "pg";

const sql = readFileSync(new URL("./schema.sql", import.meta.url), "utf8");
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const [{ db, port }] = (
  await pool.query("select current_database() as db, coalesce(inet_server_port()::text, 'socket') as port")
).rows;

await pool.query(sql);
console.log(`schema applied to ${db} (${port})`);
await pool.end();
