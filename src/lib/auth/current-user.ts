import "server-only"

import { cache } from "react"
import { redirect } from "next/navigation"

import type { Role } from "@/generated/prisma/enums"
import { ROLE_HOME, ROLE_LOGIN_PATH } from "@/lib/auth/config"
import { readSessionToken } from "@/lib/auth/cookies"
import { validateSessionToken } from "@/lib/auth/service"
import type { SessionUser } from "@/types/auth"

/**
 * The signed-in user for this request, or null. Checked against the database (not just the cookie), and
 * memoised per request so several components can call it without repeated queries.
 *
 * Reads cookies, so with Cache Components it must run under a <Suspense> boundary.
 */
export const getCurrentUser = cache(async (): Promise<SessionUser | null> => {
  return validateSessionToken(await readSessionToken())
})

/**
 * Use at the top of every protected page, Server Action and data function: returns the user only if they hold
 * `role`. Not signed in -> that role's sign-in page. Signed in as another role -> their own home.
 * Layouts must not be the only check: they do not re-run on client-side navigation.
 */
export async function requireRole<R extends Role>(role: R): Promise<SessionUser & { role: R }> {
  const user = await getCurrentUser()
  if (!user) redirect(ROLE_LOGIN_PATH[role])
  if (user.role !== role) redirect(ROLE_HOME[user.role])
  return user as SessionUser & { role: R }
}
