import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

import { SESSION_COOKIE_NAME } from "@/lib/auth/config"

/**
 * OPTIMISTIC route gate only. It checks that a session cookie EXISTS, nothing more: no database, no role.
 * A forged or expired cookie passes this check on purpose; the real verification happens on the server in
 * every protected page, Server Action and data function (requireRole / the data layer).
 * Its job is to send visitors with no cookie straight to the right sign-in page, quickly.
 */
export function proxy(request: NextRequest) {
  const [, , area, page] = request.nextUrl.pathname.split("/") // ["", "portal", "student", "login"]

  // The sign-in pages themselves must stay reachable.
  if (page === "login") return NextResponse.next()

  if (!request.cookies.has(SESSION_COOKIE_NAME)) {
    return NextResponse.redirect(new URL(`/portal/${area}/login`, request.url))
  }
  return NextResponse.next()
}

export const config = {
  matcher: ["/portal/:area(student|teacher|admin)", "/portal/:area(student|teacher|admin)/:path*"],
}
