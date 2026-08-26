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

/** postgres://host/ask → postgres://host/ask_test. Deterministic, so every worker agrees. */
export function scratchUrl(base: string): string {
  if (process.env.TEST_DATABASE_URL) return process.env.TEST_DATABASE_URL;
  const u = new URL(base);
  u.pathname = `${u.pathname.replace(/\/$/, "")}_test`;
  return u.toString();
}
