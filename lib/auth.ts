import { betterAuth } from "better-auth";
import { pool } from "./db.ts";

/**
 * Accounts are admins. There is no student account — a student is identified by an opaque token
 * in their own browser (lib/asker.ts), which is why sign-up is closed by default: a public
 * sign-up endpoint on an admin-only system is a hole, not a feature.
 *
 * Create the first admin with `npm run admin:create`, the one caller that passes `allowSignUp`.
 */
export function authOptions({ allowSignUp = false } = {}) {
  return {
    database: pool,
    secret: process.env.BETTER_AUTH_SECRET,
    // Unset in development on purpose: better-auth infers it from the request, and `next dev`
    // moves to another port whenever 3000 is taken. A hardcoded port that no longer matches
    // fails as a 403 on sign-in, which reads like a wrong password rather than a config error.
    // In production it must be set — that's what the origin check has to compare against.
    baseURL: process.env.BETTER_AUTH_URL || undefined,
    emailAndPassword: {
      enabled: true,
      disableSignUp: !allowSignUp,
      // Email is step 4. Until then a forgotten password is one `npm run admin:create` away.
      minPasswordLength: 12,
    },
  };
}

export function buildAuth(opts?: Parameters<typeof authOptions>[0]) {
  return betterAuth(authOptions(opts));
}

export const auth = buildAuth();
