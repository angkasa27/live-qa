// Load .env.local for the standalone scripts. Next loads it for the app; plain `node` does not,
// and a script that silently falls back to an ambient connection is worse than one that fails —
// `psql $DATABASE_URL` with the variable unset cheerfully creates the whole schema in whatever
// default database the local socket hands you. So: read the file, or refuse to run.
import { readFileSync } from "node:fs";

const path = new URL("../.env.local", import.meta.url);

let text: string;
try {
  text = readFileSync(path, "utf8");
} catch {
  console.error("No .env.local — copy .env.example to .env.local and fill it in.");
  process.exit(1);
}

for (const line of text.split("\n")) {
  const m = /^([A-Z_][A-Z0-9_]*)=(.*)$/.exec(line.trim());
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
}

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is not set in .env.local.");
  process.exit(1);
}

/**
 * Schema changes must not go through a transaction-mode connection pooler. On Neon that means
 * the host *without* the `-pooler` suffix: PgBouncer drops session state between statements, and
 * the failures don't mention pooling — a `SET search_path` that silently doesn't persist, or a
 * write landing in a backend that inherited a read-only transaction.
 *
 * So every script here runs against DATABASE_URL_UNPOOLED when it's set, and the app keeps the
 * pooled one. Locally there's no pooler and the two are the same, so this does nothing.
 */
if (process.env.DATABASE_URL_UNPOOLED) {
  process.env.DATABASE_URL = process.env.DATABASE_URL_UNPOOLED;
} else if (process.env.DATABASE_URL.includes("-pooler.")) {
  console.error(
    "DATABASE_URL points at a pooled host and DATABASE_URL_UNPOOLED is not set.\n" +
      "Schema migrations need a direct connection — set DATABASE_URL_UNPOOLED to the same\n" +
      "connection string with the `-pooler` suffix removed from the host.",
  );
  process.exit(1);
}
