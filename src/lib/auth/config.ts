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

/** lastUsedAt is refreshed at most this often, so a page view does not cause a database write every time. */
export const LAST_USED_REFRESH_SECONDS = 5 * 60

/**
 * Brute-force protection. Failed sign-ins are counted from the audit log (no extra table, no Redis).
 * Trade-off: someone can lock a specific account for the window by failing on purpose; that is accepted
 * because the alternative (no limit) lets attackers guess passwords.
 */
export const RATE_LIMIT = {
  windowSeconds: 15 * 60,
  maxFailuresPerLoginId: 5,
  maxFailuresPerIp: 20,
} as const

/** Where each role lands after signing in (and which role may see which area). */
export const ROLE_HOME: Record<Role, string> = {
  STUDENT: "/portal/student",
  TEACHER: "/portal/teacher",
  ADMIN: "/portal/admin",
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
