import "server-only"

import type { Prisma } from "@/generated/prisma/client"
import { db } from "@/lib/db"
import {
  AUTH_AUDIT,
  LAST_USED_REFRESH_SECONDS,
  PORTAL_ROLE,
  RATE_LIMIT,
  SESSION_LIFETIMES,
} from "@/lib/auth/config"
import { getDummyHash, verifyPassword } from "@/lib/auth/password"
import { generateSessionToken, hashLoginId, hashSessionToken } from "@/lib/auth/token"
import type { SessionUser } from "@/types/auth"
import type { PortalRoleId } from "@/types/portal"

/**
 * Authentication service: the only code that creates, checks and ends login sessions.
 * It knows nothing about cookies or pages (see cookies.ts and actions.ts), which keeps it testable.
 */

const userWithProfiles = {
  student: { select: { id: true } },
  teacher: { select: { id: true } },
  admin: { select: { id: true } },
} satisfies Prisma.UserInclude

type UserWithProfiles = Prisma.UserGetPayload<{ include: typeof userWithProfiles }>

/**
 * Builds the narrow user object. Returns null if the account is inconsistent (for example role STUDENT but no
 * Student profile), so a broken account can never be used to reach data.
 */
function toSessionUser(user: UserWithProfiles): SessionUser | null {
  const profileOk =
    (user.role === "STUDENT" && user.student) ||
    (user.role === "TEACHER" && user.teacher) ||
    (user.role === "ADMIN" && user.admin)
  if (!profileOk) return null

  return {
    id: user.id,
    loginId: user.loginId,
    role: user.role,
    firstName: user.firstName,
    lastName: user.lastName,
    studentId: user.student?.id ?? null,
    teacherId: user.teacher?.id ?? null,
    adminId: user.admin?.id ?? null,
  }
}

type AuditInput = {
  userId?: string | null
  action: string
  metadata?: Prisma.InputJsonObject
}

function writeAudit({ userId = null, action, metadata }: AuditInput) {
  return db.auditLog.create({
    data: { userId, action, entityType: "User", entityId: userId, metadata },
  })
}

// ------------------------------------------------------------------------------------------------------
// Rate limiting
// ------------------------------------------------------------------------------------------------------

async function isRateLimited(loginIdHash: string, ip: string | null): Promise<boolean> {
  const since = new Date(Date.now() - RATE_LIMIT.windowSeconds * 1000)
  const failed = { action: AUTH_AUDIT.loginFailed, createdAt: { gte: since } }

  const byLoginId = await db.auditLog.count({
    where: { ...failed, metadata: { path: ["loginIdHash"], equals: loginIdHash } },
  })
  if (byLoginId >= RATE_LIMIT.maxFailuresPerLoginId) return true

  if (ip) {
    const byIp = await db.auditLog.count({ where: { ...failed, metadata: { path: ["ip"], equals: ip } } })
    if (byIp >= RATE_LIMIT.maxFailuresPerIp) return true
  }
  return false
}

// ------------------------------------------------------------------------------------------------------
// Sign in
// ------------------------------------------------------------------------------------------------------

export type AuthenticateInput = {
  portal: PortalRoleId
  loginId: string
  password: string
  /** Client IP as reported by the hosting platform; null when unknown. */
  ip: string | null
}

export type AuthenticateResult =
  | { ok: true; token: string; expiresAt: Date; user: SessionUser }
  | { ok: false; reason: "INVALID_CREDENTIALS" | "RATE_LIMITED" }

/**
 * Checks a login ID and password for one portal and, on success, creates a database session.
 *
 * - Every failure looks the same to the caller (INVALID_CREDENTIALS): unknown ID, wrong password, inactive account,
 *   and "right account, wrong portal" are indistinguishable. The real reason goes to the audit log only.
 * - A password check always runs (against a dummy hash for unknown IDs) so timing does not reveal which IDs exist.
 * - Typed login IDs are stored only as a hash in the audit log, so a password typed into the wrong box is never logged.
 */
export async function authenticate(input: AuthenticateInput): Promise<AuthenticateResult> {
  const loginId = input.loginId.trim()
  const loginIdHash = hashLoginId(loginId)
  const ip = input.ip

  if (await isRateLimited(loginIdHash, ip)) {
    await writeAudit({ action: AUTH_AUDIT.loginBlocked, metadata: { loginIdHash, ip, portal: input.portal } })
    return { ok: false, reason: "RATE_LIMITED" }
  }

  const user = await db.user.findUnique({ where: { loginId }, include: userWithProfiles })

  const passwordOk = await verifyPassword(user?.passwordHash ?? (await getDummyHash()), input.password)

  let failure: string | null = null
  if (!user) failure = "unknown_login_id"
  else if (!passwordOk) failure = "wrong_password"
  else if (!user.isActive) failure = "inactive_account"
  else if (user.role !== PORTAL_ROLE[input.portal]) failure = "wrong_portal"

  const sessionUser = user && !failure ? toSessionUser(user) : null
  if (user && !failure && !sessionUser) failure = "inconsistent_account"

  if (failure || !user || !sessionUser) {
    await writeAudit({
      userId: user?.id ?? null,
      action: AUTH_AUDIT.loginFailed,
      metadata: { loginIdHash, ip, portal: input.portal, reason: failure },
    })
    return { ok: false, reason: "INVALID_CREDENTIALS" }
  }

  const token = generateSessionToken()
  const expiresAt = new Date(Date.now() + SESSION_LIFETIMES[user.role].absolute * 1000)
  await db.session.create({ data: { userId: user.id, tokenHash: hashSessionToken(token), expiresAt } })
  await writeAudit({ userId: user.id, action: AUTH_AUDIT.loginSuccess, metadata: { ip, portal: input.portal } })

  await purgeOldSessions()

  return { ok: true, token, expiresAt, user: sessionUser }
}

/** Housekeeping: delete sessions that ended more than a week ago. Never lets a cleanup problem break sign-in. */
async function purgeOldSessions() {
  const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
  try {
    await db.session.deleteMany({ where: { OR: [{ expiresAt: { lt: cutoff } }, { revokedAt: { lt: cutoff } }] } })
  } catch {
    // ignore: the next sign-in will try again
  }
}

// ------------------------------------------------------------------------------------------------------
// Checking a session on every request
// ------------------------------------------------------------------------------------------------------

/**
 * Resolves a session token (from the cookie) to the current user, or null.
 * The database is consulted every time, so revoking a session or deactivating a user takes effect immediately.
 */
export async function validateSessionToken(token: string | undefined): Promise<SessionUser | null> {
  if (!token || token.length > 200) return null

  const session = await db.session.findUnique({
    where: { tokenHash: hashSessionToken(token) },
    include: { user: { include: userWithProfiles } },
  })
  if (!session) return null

  const now = Date.now()
  const { idle } = SESSION_LIFETIMES[session.user.role]

  if (session.revokedAt) return null
  if (session.expiresAt.getTime() <= now) return null
  if (now - session.lastUsedAt.getTime() > idle * 1000) return null
  if (!session.user.isActive) return null

  const user = toSessionUser(session.user)
  if (!user) return null

  if (now - session.lastUsedAt.getTime() > LAST_USED_REFRESH_SECONDS * 1000) {
    await db.session.update({ where: { id: session.id }, data: { lastUsedAt: new Date(now) } })
  }

  return user
}

// ------------------------------------------------------------------------------------------------------
// Ending sessions
// ------------------------------------------------------------------------------------------------------

/** Sign out: revokes the session that owns this token (idempotent) and records it. */
export async function revokeSessionByToken(token: string | undefined): Promise<void> {
  if (!token || token.length > 200) return

  const tokenHash = hashSessionToken(token)
  const session = await db.session.findUnique({ where: { tokenHash }, select: { id: true, userId: true, revokedAt: true } })
  if (!session || session.revokedAt) return

  await db.session.update({ where: { id: session.id }, data: { revokedAt: new Date() } })
  await writeAudit({ userId: session.userId, action: AUTH_AUDIT.logout })
}

/** Ends every session of a user (for use on password change, deactivation, or "sign out everywhere"). */
export async function revokeAllSessionsForUser(userId: string): Promise<number> {
  const result = await db.session.updateMany({ where: { userId, revokedAt: null }, data: { revokedAt: new Date() } })
  return result.count
}
