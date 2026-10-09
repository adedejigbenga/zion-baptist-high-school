import { db } from "@/lib/db"

/**
 * Defence in depth for the internal admin write functions. The Server Actions already call `requireRole("ADMIN")`; these
 * functions ALSO confirm in the database that the acting user is an active administrator with an Admin profile, so a caller
 * wired up wrongly (or a teacher/student user ID passed in by mistake) cannot change anything.
 */
export async function isActiveAdmin(userId: string): Promise<boolean> {
  const admin = await db.user.findFirst({
    where: { id: userId, role: "ADMIN", isActive: true, admin: { isNot: null } },
    select: { id: true },
  })
  return admin !== null
}

/** Records a refused admin action by a non-admin. An ID that matches no user is logged without a user link (the foreign key would reject it). */
export async function recordAdminDenied(userId: string, entityType: string, attempt: string): Promise<void> {
  const known = (await db.user.findUnique({ where: { id: userId }, select: { id: true } })) !== null
  await db.auditLog.create({
    data: { userId: known ? userId : null, action: "ADMIN_ACCESS_DENIED", entityType, metadata: known ? { attempt } : { attempt, unknownUser: true } },
  })
}

/** Result of the standard gate in front of every admin write. */
export type GateFailure = { ok: false; message: string }

/**
 * The standard gate for admin writes: confirms in the database that the actor is an active administrator. Returns a failure
 * to hand straight back (and records the refused attempt), or null when the actor may continue.
 */
export async function adminGate(userId: string, entityType: string, attempt: string): Promise<GateFailure | null> {
  if (await isActiveAdmin(userId)) return null
  await recordAdminDenied(userId, entityType, attempt)
  return { ok: false, message: "Only an administrator can do this." }
}

/** True for a Prisma "unique constraint failed" error (P2002), so a race between two admins reads as a normal message. */
export function isUniqueViolation(error: unknown): boolean {
  return typeof error === "object" && error !== null && (error as { code?: unknown }).code === "P2002"
}

/** True for a Postgres exclusion/check/unique violation that reached us through the driver adapter (23P01, 23514, 23505). */
export function isConstraintViolation(error: unknown): boolean {
  if (typeof error !== "object" || error === null) return false
  const e = error as { code?: unknown; cause?: { code?: unknown; originalCode?: unknown } }
  const codes = [e.code, e.cause?.code, e.cause?.originalCode].map(String)
  return codes.some((c) => c === "P2002" || c === "23P01" || c === "23514" || c === "23505")
}
