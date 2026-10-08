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
