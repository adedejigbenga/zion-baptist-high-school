import "server-only"

import { cache } from "react"
import { redirect } from "next/navigation"

import type { Role } from "@/generated/prisma/enums"
import { ROLE_HOME, ROLE_LOGIN_PATH, SESSION_ENDED_PATH } from "@/lib/auth/config"
import { readSessionToken } from "@/lib/auth/cookies"
import { validateSessionToken } from "@/lib/auth/service"
import type { SessionUser } from "@/types/auth"

/**
 * Who is making this request, checked against the database (never just the cookie). Memoised per request, so
 * several components can ask without repeated queries.
 *
 * `hadCookie` tells "never signed in" apart from "has a cookie that is no longer valid" (expired, revoked,
 * deactivated user, forged). A page cannot delete a cookie while rendering, so in the second case the visitor is
 * sent through SESSION_ENDED_PATH, a route that removes the dead cookie.
 *
 * Reads cookies, so with Cache Components it must run under a <Suspense> boundary.
 */
const getSessionState = cache(async (): Promise<{ user: SessionUser | null; hadCookie: boolean }> => {
  const token = await readSessionToken()
  return { user: await validateSessionToken(token), hadCookie: Boolean(token) }
})

/** The signed-in user for this request, or null. */
export async function getCurrentUser(): Promise<SessionUser | null> {
  return (await getSessionState()).user
}

/** Where to send a visitor who is not (or no longer) signed in. */
function signInRedirect(loginPath: string, hadCookie: boolean): never {
  redirect(hadCookie ? `${SESSION_ENDED_PATH}?to=${encodeURIComponent(loginPath)}` : loginPath)
}

/** Requires any signed-in user. Not signed in -> the portal gateway. */
export async function requireUser(): Promise<SessionUser> {
  const { user, hadCookie } = await getSessionState()
  if (!user) signInRedirect("/portal", hadCookie)
  return user
}

/**
 * Use at the top of every protected page, Server Action and data function: returns the user only if they hold
 * `role`. Not signed in -> that role's sign-in page. Signed in as another role -> access denied, back to their own home.
 * Layouts must not be the only check: they do not re-run on client-side navigation.
 */
export async function requireRole<R extends Role>(role: R): Promise<SessionUser & { role: R }> {
  const { user, hadCookie } = await getSessionState()
  if (!user) signInRedirect(ROLE_LOGIN_PATH[role], hadCookie)
  if (user.role !== role) redirect(ROLE_HOME[user.role])
  return user as SessionUser & { role: R }
}
