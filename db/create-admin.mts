// Create the superadmin. Sign-up is closed on the running app by design (lib/auth.ts), so this
// is the only way to make the first account — every other admin is made from /admin/pengguna.
//
//   npm run admin:create -- "Nama" email@example.com "password-min-8-chars"
//
// Run against an email that already exists and it promotes that account instead, which is the
// upgrade path for the single operator this app had before roles existed.
import "./env.mts";

// npm eats the `--` separator, pnpm passes it straight through. Drop it either way, so the
// documented command line works under both.
const args = process.argv.slice(2).filter((a, i) => !(i === 0 && a === "--"));
const [name, email, password] = args;
if (!name || !email || !password) {
  console.error('Usage: npm run admin:create -- "Nama" email@example.com "password"');
  process.exit(1);
}

const { auth } = await import("../lib/auth.ts");
const { one, pool } = await import("../lib/db.ts");

// createUser is an admin endpoint, but it skips its own permission check when there is no
// session to check — which is exactly this case, a script with no request behind it.
async function superadmin() {
  const existing = await one<{ id: string }>(`select id from "user" where lower(email) = lower($1)`, [email]);
  if (existing) {
    await pool.query(`update "user" set role = 'superadmin' where id = $1`, [existing.id]);
    console.log(`promoted to superadmin: ${email}`);
    return existing.id;
  }
  const { user } = await auth.api.createUser({
    body: { name, email, password, role: "superadmin" },
  });
  console.log(`superadmin created: ${user.email}`);
  return user.id;
}

try {
  const id = await superadmin();
  // Every majelis belongs to whoever made it. The ones that predate ownership belong to nobody,
  // which would leave them visible to the superadmin alone; hand them over here, where the
  // superadmin's id exists for the first time.
  const { rowCount } = await pool.query(
    `update events set created_by = $1 where created_by is null`,
    [id],
  );
  if (rowCount) console.log(`${rowCount} majelis lama dialihkan ke akun ini`);
} catch (err) {
  console.error(`failed: ${err instanceof Error ? err.message : String(err)}`);
  process.exit(1);
}
process.exit(0);
