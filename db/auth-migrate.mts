// Create/update better-auth's own tables ("user", session, account, verification).
//
//   npm run auth:migrate
//
// Uses the getMigrations() shipped inside the installed better-auth rather than
// `npx @better-auth/cli`. The published CLI is deprecated and stalled several minors behind the
// library, and running the two together silently produces an `account` table missing columns the
// library expects. This can't drift: it is the same version as the app.
import "./env.mts";

const { getMigrations } = await import("better-auth/db/migration");
const { authOptions } = await import("../lib/auth.ts");

const { toBeCreated, toBeAdded, runMigrations } = await getMigrations(authOptions() as never);

const describe = (list: { table: string; fields: Record<string, unknown> }[]) =>
  list.map((t) => `${t.table} (${Object.keys(t.fields).join(", ")})`);

if (!toBeCreated.length && !toBeAdded.length) {
  console.log("auth schema already up to date");
} else {
  for (const line of describe(toBeCreated)) console.log(`create ${line}`);
  for (const line of describe(toBeAdded)) console.log(`alter  ${line}`);
  await runMigrations();
  console.log("auth schema migrated");
}
process.exit(0);
