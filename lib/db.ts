import { Pool } from "pg";
import { attachDatabasePool } from "@vercel/functions";

// One pool per process. Next's dev server re-evaluates modules on every edit, so without the
// global the pool leaks a connection set per hot reload until Postgres refuses new ones.
const globalForDb = globalThis as unknown as { askPool?: Pool };

function createPool() {
  const p = new Pool({
    connectionString: process.env.DATABASE_URL,
    // Every serverless instance opens its own pool, and there can be a lot of instances. Keep
    // this small and let the connection pooler on the other end do the fan-in — on Neon that
    // means the `-pooler` host, which is what DATABASE_URL should point at in production.
    max: Number(process.env.DB_POOL_MAX ?? 5),
    // A suspended Neon compute takes a few hundred ms to wake; the default 0 (no timeout) would
    // hang a request forever if the database were genuinely unreachable.
    connectionTimeoutMillis: 10_000,
    idleTimeoutMillis: 30_000,
  });
  // Vercel Fluid compute reuses an instance across requests and then suspends it. This lets the
  // runtime drain the pool at suspension instead of leaving connections stranded server-side.
  // No-op off Vercel.
  attachDatabasePool(p);
  return p;
}

export const pool = globalForDb.askPool ?? createPool();

if (process.env.NODE_ENV !== "production") globalForDb.askPool = pool;

export async function query<T>(text: string, params: unknown[] = []): Promise<T[]> {
  const { rows } = await pool.query(text, params);
  return rows as T[];
}

export async function one<T>(text: string, params: unknown[] = []): Promise<T | null> {
  const rows = await query<T>(text, params);
  return rows[0] ?? null;
}
