import { betterAuth } from "better-auth";
import { admin } from "better-auth/plugins/admin";
import { adminAc, userAc } from "better-auth/plugins/admin/access";
import { pool } from "./db.ts";

/**
 * Accounts are admins. There is no student account; a student is identified by an opaque token
 * in their own browser (lib/asker.ts), which is why sign-up is closed: a public sign-up endpoint
 * on an admin-only system is a hole, not a feature.
 *
 * Two roles. A `superadmin` mints the others and sees every majelis; an `admin` only ever sees
 * the ones they created (lib/queries.ts, lib/actions.ts). The role map below is what does the
 * authorization on better-auth's own /admin/* endpoints: the plugin looks the role up in
 * `roles`, so `admin` -> userAc (no statements) is refused by all of them and only a superadmin
 * can create, list, ban or delete an account.
 *
 * Create the first superadmin with `npm run admin:create`.
 */
export function authOptions() {
  return {
    database: pool,
    secret: process.env.BETTER_AUTH_SECRET,
    // Unset in development on purpose: better-auth infers it from the request, and `next dev`
    // moves to another port whenever 3000 is taken. A hardcoded port that no longer matches
    // fails as a 403 on sign-in, which reads like a wrong password rather than a config error.
    // In production it must be set; that's what the origin check has to compare against.
    baseURL: process.env.BETTER_AUTH_URL || undefined,
    emailAndPassword: {
      enabled: true,
      disableSignUp: true,
      // The admin screen sets passwords for other people, so this floor is the only thing
      // standing between a hurried operator and a four-character password.
      minPasswordLength: 8,
    },
    plugins: [
      admin({
        // A row with no role reads as a plain admin rather than as nothing: the accounts that
        // predate this column keep working, and they keep working with the *smaller* powers.
        defaultRole: "admin",
        adminRoles: ["superadmin"],
        roles: { superadmin: adminAc, admin: userAc },
      }),
    ],
  };
}

export function buildAuth() {
  return betterAuth(authOptions());
}

export const auth = buildAuth();

/** The role names as they are stored. `null` is possible on rows older than the column. */
export type Role = "superadmin" | "admin";

/**
 * The session user's role. Read through a helper because better-auth's inferred session type
 * doesn't carry plugin-added columns, and the alternative is the same cast at every call site.
 * The column is returned at runtime; a row that predates it reads as null, which is an admin.
 */
export function roleOf(user: object): string | null {
  return (user as { role?: string | null }).role ?? null;
}

export function isSuperadmin(user: object) {
  return roleOf(user) === "superadmin";
}
