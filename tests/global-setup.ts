import { readFile } from "node:fs/promises";
import { Pool } from "pg";
import { baseUrl, scratchUrl } from "./dburl.ts";

// Runs once. Builds a throwaway database next to the app's (same credentials) and applies
// db/schema.sql to it, so integration tests can truncate freely without touching real data.
export default async function globalSetup() {
  const base = baseUrl();
  if (!base) {
    console.warn("[test] no DATABASE_URL / TEST_DATABASE_URL — db tests will be skipped");
    return;
  }

  const scratch = scratchUrl(base);
  const name = decodeURIComponent(new URL(scratch).pathname.slice(1));
  if (!/^[A-Za-z0-9_]+$/.test(name)) throw new Error(`unsafe test db name: ${name}`);

  const admin = new URL(base);
  admin.pathname = "/postgres";
  const bootstrap = new Pool({ connectionString: admin.toString() });
  try {
    await bootstrap.query(`drop database if exists "${name}"`);
    await bootstrap.query(`create database "${name}"`);
  } catch (e) {
    throw new Error(
      `Could not create scratch database "${name}". ` +
        `If the credentials lack createdb rights, set TEST_DATABASE_URL to an existing empty database.`,
      { cause: e },
    );
  } finally {
    await bootstrap.end();
  }

  const target = new Pool({ connectionString: scratch });
  try {
    await target.query(await readFile(new URL("../db/schema.sql", import.meta.url), "utf8"));
  } finally {
    await target.end();
  }
  console.log(`[test] scratch database ready: ${name}`);
}
