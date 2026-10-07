import "server-only"

import { cookies } from "next/headers"

import { SESSION_COOKIE_BASE, SESSION_COOKIE_NAME } from "@/lib/auth/config"

/**
 * The session cookie holds only the random session token (never user data, never a role).
 * HttpOnly: JavaScript cannot read it. SameSite=Lax: not sent on cross-site POSTs. Secure in production.
 * It can only be set from a Server Action or Route Handler, never while rendering a page.
 */
export async function setSessionCookie(token: string, expiresAt: Date): Promise<void> {
  const store = await cookies()
  store.set(SESSION_COOKIE_NAME, token, { ...SESSION_COOKIE_BASE, expires: expiresAt })
}

/**
 * Expires the cookie by overwriting it with the same attributes it was set with (see SESSION_COOKIE_BASE);
 * `cookies().delete()` is not used because it omits `Secure`, which `__Host-` cookies require for any change.
 */
export async function clearSessionCookie(): Promise<void> {
  const store = await cookies()
  store.set(SESSION_COOKIE_NAME, "", { ...SESSION_COOKIE_BASE, expires: new Date(0), maxAge: 0 })
}

export async function readSessionToken(): Promise<string | undefined> {
  const store = await cookies()
  return store.get(SESSION_COOKIE_NAME)?.value
}
