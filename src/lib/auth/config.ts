/**
 * Authentication settings. No secrets and no database access here, so this file is safe to import from
 * anywhere (including proxy.ts).
 */
import type { Role } from "@/generated/prisma/enums"
import type { PortalRoleId } from "@/types/portal"

const isProduction = process.env.NODE_ENV === "production"

/**
 * `__Host-` cookies must be Secure, have Path=/ and no Domain, which stops sibling subdomains from overwriting
 * them. Browsers only accept Secure cookies over HTTPS, so the prefix is used in production only.
 */
export const SESSION_COOKIE_NAME = isProduction ? "__Host-zbhs_session" : "zbhs_session"

const HOUR = 60 * 60
const DAY = 24 * HOUR

/** Session lifetime per role, in seconds. Admins hold more power, so their sessions are shorter. */
export const SESSION_LIFETIMES: Record<Role, { absolute: number; idle: number }> = {
  STUDENT: { absolute: 7 * DAY, idle: 24 * HOUR },
  TEACHER: { absolute: 7 * DAY, idle: 24 * HOUR },
  ADMIN: { absolute: 12 * HOUR, idle: 2 * HOUR },
}

/**
 * Cookie attributes. The same set is used to create AND to expire the cookie: browsers ignore a change to a
 * `__Host-` cookie that does not also carry Secure and Path=/.
 */
export const SESSION_COOKIE_BASE = {
  httpOnly: true,
  secure: isProduction,
  sameSite: "lax",
  path: "/",
} as const

/** Route that clears a stale (invalid/expired/revoked) session cookie, then sends the visitor to sign in. */
export const SESSION_ENDED_PATH = "/portal/session-ended"

/** lastUsedAt is refreshed at most this often, so a page view does not cause a database write every time. */
export const LAST_USED_REFRESH_SECONDS = 5 * 60

/**
 * Brute-force protection. Failed sign-ins are counted from the audit log (no extra table, no Redis).
 *
 * - Per login ID: the main defence against password guessing. 8 failures in 15 minutes blocks that ID (a child who
 *   mistypes a few times is fine). Trade-off: someone can lock a specific account for the window by failing on purpose.
 * - Per IP: deliberately HIGH. A whole school (or a computer lab) can share one public IP address, and many students
 *   mistyping at once must never lock everyone out. This only stops very large automated attacks from one address.
 */
export const RATE_LIMIT = {
  windowSeconds: 15 * 60,
  maxFailuresPerLoginId: 8,
  maxFailuresPerIp: 100,
} as const

/** Where each role lands after signing in (and which role may see which area). */
export const ROLE_HOME: Record<Role, string> = {
  STUDENT: "/portal/student",
  TEACHER: "/portal/teacher",
  ADMIN: "/portal/admin",
}

/** Display name of each role's portal. */
export const ROLE_PORTAL_NAME: Record<Role, string> = {
  STUDENT: "Student Portal",
  TEACHER: "Teacher Portal",
  ADMIN: "Admin Portal",
}

/** Portal login page -> the role that may sign in there. */
export const PORTAL_ROLE: Record<PortalRoleId, Role> = {
  student: "STUDENT",
  teacher: "TEACHER",
  admin: "ADMIN",
}

export const ROLE_LOGIN_PATH: Record<Role, string> = {
  STUDENT: "/portal/student/login",
  TEACHER: "/portal/teacher/login",
  ADMIN: "/portal/admin/login",
}

/** Audit log action names for authentication events. */
export const AUTH_AUDIT = {
  loginSuccess: "AUTH_LOGIN_SUCCESS",
  loginFailed: "AUTH_LOGIN_FAILED",
  loginBlocked: "AUTH_LOGIN_BLOCKED",
  logout: "AUTH_LOGOUT",
} as const
