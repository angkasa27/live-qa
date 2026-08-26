import "server-only";
import { createHash, randomUUID } from "node:crypto";
import { cookies, headers } from "next/headers";

const COOKIE = "ask_asker";
const YEAR = 60 * 60 * 24 * 365;

/**
 * A student is not an account. They're an opaque token in their own browser, which is what makes
 * "Pertanyaan saya" work with no login, no phone number, and no PII.
 *
 * Ceiling: clearing the browser or switching device loses the thread. That's the accepted cost
 * of asking for nothing; the upgrade path is contact detail at submit time (step 4), not a
 * student account.
 */
export async function askerToken() {
  const jar = await cookies();
  return jar.get(COOKIE)?.value ?? null;
}

/** Same, but mints one when there isn't one. Only callable from an action or route handler. */
export async function ensureAskerToken() {
  const jar = await cookies();
  const existing = jar.get(COOKIE)?.value;
  if (existing) return existing;

  const token = randomUUID();
  jar.set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: YEAR,
    path: "/",
  });
  return token;
}

/**
 * Salted hash of the caller's address, for rate limiting only. The raw address is never stored:
 * a majelis question can be personal, and an IP plus a timestamp is deanonymising.
 */
export async function ipHash() {
  const h = await headers();
  const ip = (h.get("x-forwarded-for") ?? "").split(",")[0].trim() || h.get("x-real-ip") || "local";
  return createHash("sha256").update(`${process.env.IP_HASH_SALT ?? ""}:${ip}`).digest("hex");
}
