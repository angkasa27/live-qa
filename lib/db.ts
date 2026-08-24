import { Pool } from "pg";

// One pool per process. Next's dev server re-evaluates modules on every edit, so without the
// global the pool leaks a connection set per hot reload until Postgres refuses new ones.
const globalForDb = globalThis as unknown as { askPool?: Pool };

export const pool =
  globalForDb.askPool ??
  new Pool({
    connectionString: process.env.DATABASE_URL,
    // ponytail: fine for one app server. Behind several, size this against Postgres's
    // max_connections or put PgBouncer in front.
    max: 10,
  });

if (process.env.NODE_ENV !== "production") globalForDb.askPool = pool;

export async function query<T>(text: string, params: unknown[] = []): Promise<T[]> {
  const { rows } = await pool.query(text, params);
  return rows as T[];
}

export async function one<T>(text: string, params: unknown[] = []): Promise<T | null> {
  const rows = await query<T>(text, params);
  return rows[0] ?? null;
}
