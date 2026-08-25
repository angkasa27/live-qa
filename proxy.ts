import { NextResponse, type NextRequest } from "next/server";
import { getSessionCookie } from "better-auth/cookies";

/**
 * Optimistic only: it checks that a session cookie exists, not that it's valid. That is all
 * Proxy should do — Next's docs say plainly it isn't a session-management or authorization
 * solution, and it runs before any database is reachable. The real check is requireSession()
 * in lib/guard.ts, which every protected page calls.
 */
export function proxy(request: NextRequest) {
  if (getSessionCookie(request)) return NextResponse.next();

  const signIn = new URL("/masuk", request.url);
  signIn.searchParams.set("next", request.nextUrl.pathname);
  return NextResponse.redirect(signIn);
}

export const config = {
  matcher: ["/admin/:path*"],
};
