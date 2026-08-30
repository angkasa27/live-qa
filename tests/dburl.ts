import { readFileSync } from "node:fs";

// Same loader as db/env.mts, minus the pooled-host refusal — tests only read and write
// their own scratch database, so the pooler is fine.
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

/**
 * postgres://host/ask → postgres://host/ask_test. Deterministic, so every worker agrees.
 *
 * Every path to a test database goes through here: global-setup.ts drops and recreates whatever
 * this returns, and setup.ts points lib/db.ts at it before the integration tests truncate. So
 * this is where the target gets checked, once, rather than in each caller.
 *
 * The check exists because both callers used to trust TEST_DATABASE_URL blindly, and this ran
 * against a production database. `_test` is required in the name so that a mistyped or
 * copy-pasted URL fails loudly here instead of at `drop database`.
 */
export function scratchUrl(base: string): string {
  const url = process.env.TEST_DATABASE_URL ?? withTestSuffix(base);
  const name = decodeURIComponent(new URL(url).pathname.slice(1));

  if (!/^[A-Za-z0-9_]+$/.test(name) || !name.endsWith("_test")) {
    throw new Error(
      `Refusing to run tests against database "${name}": the name must end in _test.\n` +
        (process.env.TEST_DATABASE_URL
          ? "TEST_DATABASE_URL points at a database these tests would drop and truncate. " +
            "Point it at a scratch database whose name ends in _test, or unset it."
          : "Derived from DATABASE_URL, which does not look like a database name we can suffix."),
    );
  }
  return url;
}

function withTestSuffix(base: string): string {
  const u = new URL(base);
  u.pathname = `${u.pathname.replace(/\/$/, "")}_test`;
  return u.toString();
}
