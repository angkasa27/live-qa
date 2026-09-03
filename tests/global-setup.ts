import { readFile } from "node:fs/promises";
import { Pool } from "pg";
import { baseUrl, testUrl } from "./dburl.ts";

// Runs once, against the local database the app itself uses. It no longer builds a scratch
// copy: db/schema.sql is written to be idempotent (`create table if not exists`, and each
// migration a no-op on a database that already has it), so applying it here just means a fresh
// clone can run `pnpm test` before it has run `pnpm setup`.
//
// testUrl() refuses anything that is not on this machine. Nothing below is safe to point at a
// server someone else is using.
export default async function globalSetup() {
  const base = baseUrl();
  if (!base) {
    console.warn("[test] no DATABASE_URL / TEST_DATABASE_URL — db tests will be skipped");
    return;
  }

  const url = testUrl(base);
  const name = decodeURIComponent(new URL(url).pathname.slice(1));

  const target = new Pool({ connectionString: url });
  try {
    await target.query(await readFile(new URL("../db/schema.sql", import.meta.url), "utf8"));
  } finally {
    await target.end();
  }
  console.log(`[test] using local database: ${name} (its tables get truncated)`);
}
