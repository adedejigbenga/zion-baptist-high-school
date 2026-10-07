import type { Role } from "@/generated/prisma/enums"

/**
 * The signed-in user as the rest of the application sees them. Deliberately narrow: no password hash,
 * no session token. Role and profile IDs come from the database on every request, never from the browser.
 */
export type SessionUser = {
  id: string
  loginId: string
  role: Role
  firstName: string
  lastName: string
  /** Set only when role is STUDENT. Student-facing data is always filtered by THIS id, never by a URL or form value. */
  studentId: string | null
  /** Set only when role is TEACHER. */
  teacherId: string | null
  /** Set only when role is ADMIN. */
  adminId: string | null
}
