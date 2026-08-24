// Create an admin account. Sign-up is closed on the running app by design (lib/auth.ts), so this
// is the only way in — including for a forgotten password, until email lands in step 4.
//
//   npm run admin:create -- "Nama" email@example.com "password-min-12-chars"
import { readFileSync } from "node:fs";

for (const line of readFileSync(new URL("../.env.local", import.meta.url), "utf8").split("\n")) {
  const m = /^([A-Z_]+)=(.*)$/.exec(line.trim());
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
}

const [name, email, password] = process.argv.slice(2);
if (!name || !email || !password) {
  console.error('Usage: npm run admin:create -- "Nama" email@example.com "password"');
  process.exit(1);
}

const { buildAuth } = await import("../lib/auth.ts");
const auth = buildAuth({ allowSignUp: true });

try {
  const res = await auth.api.signUpEmail({ body: { name, email, password } });
  console.log(`admin created: ${res.user.email}`);
} catch (err) {
  console.error(`failed: ${err instanceof Error ? err.message : String(err)}`);
  process.exit(1);
}
process.exit(0);
