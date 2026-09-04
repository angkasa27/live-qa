import "server-only";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { auth, isSuperadmin } from "./auth.ts";
import { canWorkOn, getEvent } from "./queries.ts";

/**
 * The real check. proxy.ts does a cheap cookie-presence redirect so signed-out visitors don't
 * render an admin shell, but Next's own docs are explicit that proxy is not an authorization
 * boundary; every protected page calls this.
 */
export async function requireSession(returnTo: string) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect(`/masuk?next=${encodeURIComponent(returnTo)}`);
  return session;
}

/**
 * The id to scope an admin read by: their own for an admin, `null` for a superadmin, which every
 * query below reads as "no filter". One expression, so no caller invents its own.
 */
export function scopeOf(user: { id: string }) {
  return isSuperadmin(user) ? null : user.id;
}

/** Superadmin-only pages. 404 rather than 403: an admin has no business knowing it is there. */
export async function requireSuperadmin(returnTo: string) {
  const session = await requireSession(returnTo);
  if (!isSuperadmin(session.user)) notFound();
  return session;
}

/**
 * A majelis this admin is staffing, or a 404. Same answer for "doesn't exist" and "you are not
 * on it", which is the point: an admin cannot probe for other people's sessions by URL.
 *
 * Returns the event so the page doesn't fetch it twice, and `canEdit` so the screen can tell the
 * difference between running a session and owning it — an admin moderates and moves the session,
 * the superadmin writes it and answers it. That flag is a convenience for rendering; the
 * boundary itself is re-checked in every action (lib/actions.ts).
 *
 * Hidden events are included: a session can be staffed before it is announced.
 */
export async function requireEventAccess(returnTo: string, id: string) {
  const session = await requireSession(returnTo);
  const event = await getEvent(id, { includeHidden: true });
  if (!event || !(await canWorkOn(id, scopeOf(session.user)))) notFound();
  return { session, event, canEdit: isSuperadmin(session.user) };
}
