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
