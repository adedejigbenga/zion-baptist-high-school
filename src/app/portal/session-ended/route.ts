import { NextResponse, type NextRequest } from "next/server"

import { ROLE_HOME, ROLE_LOGIN_PATH, SESSION_COOKIE_BASE, SESSION_COOKIE_NAME } from "@/lib/auth/config"
import { validateSessionToken } from "@/lib/auth/service"

/**
 * Removes a DEAD session cookie (expired, revoked, deactivated user, forged) and sends the visitor to sign in.
 * Pages cannot delete cookies while rendering, so requireRole() redirects here.
 *
 * Safe as a GET: it re-validates first and does nothing to a session that is still valid (such a visitor is just
 * sent to their own home), so a third party cannot use a link to this route to sign someone out.
 * The destination is checked against a fixed allow-list, so it cannot be used as an open redirect.
 */
const ALLOWED_DESTINATIONS = new Set<string>(["/portal", ...Object.values(ROLE_LOGIN_PATH)])

export async function GET(request: NextRequest) {
  const requested = request.nextUrl.searchParams.get("to") ?? ""
  const destination = ALLOWED_DESTINATIONS.has(requested) ? requested : "/portal"

  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value
  const user = await validateSessionToken(token)

  const response = NextResponse.redirect(new URL(user ? ROLE_HOME[user.role] : destination, request.url))
  response.headers.set("Cache-Control", "no-store")

  if (!user && token) {
    response.cookies.set(SESSION_COOKIE_NAME, "", { ...SESSION_COOKIE_BASE, expires: new Date(0), maxAge: 0 })
  }
  return response
}
