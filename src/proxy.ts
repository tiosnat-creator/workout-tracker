import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Optimistic check only: cookie presence, no DB call, since proxy runs on
// every request (including prefetches). Real enforcement — session
// validity, disabled accounts, roles — happens in the DAL
// (src/lib/session.ts, src/lib/roles.ts) that every page/action already
// calls; proxy should never be the only line of defense.
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // /login and /login/verify must stay reachable while signed out — they
  // ARE the sign-in flow. Server Actions post back to the route they're
  // used on, so this also covers requestMagicLink/consumeMagicLink.
  if (pathname === "/login" || pathname.startsWith("/login/")) {
    return NextResponse.next();
  }

  if (!request.cookies.has("session")) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
