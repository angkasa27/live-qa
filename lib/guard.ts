import "server-only";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "./auth.ts";

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
