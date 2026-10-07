import type { Role } from "@/generated/prisma/enums"
import { db } from "@/lib/db"

/** Refuse to run destructive helpers unless the connection really is the *_test database. */
function assertTestDatabase() {
  const name = new URL(process.env.DATABASE_URL ?? "postgresql://x/none").pathname.slice(1)
  if (!name.endsWith("_test")) throw new Error(`Refusing to modify "${name}": it is not a test database.`)
}

/** Empties every table (cascading from the parent tables). Only ever runs against the *_test database. */
export async function resetDatabase() {
  assertTestDatabase()
  await db.$executeRawUnsafe(
    // Truncating the parent tables cascades to everything that references them.
    'TRUNCATE TABLE "User", "AcademicSession", "SchoolClass", "Subject", "GradingScheme", "AuditLog" RESTART IDENTITY CASCADE',
  )
}

let counter = 0

type CreateUserInput = {
  loginId: string
  role: Role
  passwordHash: string
  isActive?: boolean
  /** Set false to build a deliberately broken account (role without its profile). */
  withProfile?: boolean
}

export async function createUser({ loginId, role, passwordHash, isActive = true, withProfile = true }: CreateUserInput) {
  assertTestDatabase()
  counter += 1
  const user = await db.user.create({
    data: { loginId, passwordHash, role, isActive, firstName: "Test", lastName: `User${counter}` },
  })
  if (withProfile) {
    if (role === "STUDENT") await db.student.create({ data: { userId: user.id, admissionNumber: `TEST/${counter}` } })
    if (role === "TEACHER") await db.teacher.create({ data: { userId: user.id, employeeNumber: `TCH-TEST-${counter}` } })
    if (role === "ADMIN") await db.admin.create({ data: { userId: user.id } })
  }
  return user
}
