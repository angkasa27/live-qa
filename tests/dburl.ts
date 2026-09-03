import { readFileSync } from "node:fs";

// Same loader as db/env.mts, minus the pooled-host refusal — the pooler is fine for tests.
try {
  const text = readFileSync(new URL("../.env.local", import.meta.url), "utf8");
  for (const line of text.split("\n")) {
    const m = /^([A-Z_][A-Z0-9_]*)=(.*)$/.exec(line.trim());
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
  }
} catch {
  // No .env.local — unit tests still run, db tests skip.
}

export function baseUrl(): string | null {
  return process.env.TEST_DATABASE_URL ?? process.env.DATABASE_URL ?? null;
}

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1", "[::1]"]);

/**
 * The database the integration tests run against: the local one, directly.
 *
 * There used to be a third database. Every run derived `<name>_test`, created it, applied the
 * schema and dropped it next time, which meant a scratch copy on whatever server DATABASE_URL
 * named — including, once, the production Neon project, where it sat for a week. Two databases
 * is the whole inventory now: production, and the local one that tests share with `next dev`.
 *
 * So the guard moves from the database's *name* to its *host*. `_test` in a name was a
 * convention a copy-pasted URL could satisfy by accident; a hostname cannot be localhost by
 * accident. These tests truncate on every file, so anything not on this machine is refused
 * before the first statement rather than at the first `drop database`.
 *
 * The cost of sharing: `pnpm test` empties the local events, questions and answer_revisions.
 * That is the trade for having no third database — reseed with `pnpm db:seed`.
 */
export function testUrl(base: string): string {
  const url = new URL(base);
  const host = url.hostname.toLowerCase();

  if (!LOCAL_HOSTS.has(host)) {
    throw new Error(
      `Refusing to run tests against "${host}": these tests truncate every table they touch, ` +
        `and this is not a local database.\n` +
        `Point DATABASE_URL (or TEST_DATABASE_URL) at your local Postgres before running them.`,
    );
  }
  return url.toString();
}
