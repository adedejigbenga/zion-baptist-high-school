import "server-only"

import { db } from "@/lib/db"
import { excerpt } from "@/lib/format"
import type { Prisma } from "@/generated/prisma/client"
import type {
  StudentAnnouncementItem,
  StudentDashboard,
  StudentProfile,
  StudentProfileSummary,
  StudentResultStatus,
} from "@/types/student"

/**
 * INTERNAL. Builds the dashboard for ONE student whose ID the caller has already established from the server-side
 * session. Pages and components must never import this file: they call `getStudentDashboard()` in ./student.ts,
 * which takes no student ID at all. (Tests import this file directly.)
 *
 * Result privacy rule: the `result` query below selects only `status` and `publishedAt`. It never joins entries,
 * scores, grades, totals or remarks, so unpublished (and even published) result data cannot leave this function.
 */

const ANNOUNCEMENT_LIMIT = 5

/**
 * The ONE rule for which announcements a student may see: published, already live, not expired, and either
 * school-wide or addressed to the student's own class.
 */
function visibleAnnouncementsWhere(classId: string | undefined, now: Date): Prisma.AnnouncementWhereInput {
  return {
    isPublished: true,
    AND: [
      { OR: [{ publishedAt: null }, { publishedAt: { lte: now } }] },
      { OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] },
      { OR: classId ? [{ targetClassId: null }, { targetClassId: classId }] : [{ targetClassId: null }] },
    ],
  }
}

async function currentEnrollment(studentId: string) {
  const session = await db.academicSession.findFirst({ where: { isCurrent: true }, select: { id: true, name: true } })
  if (!session) return { session: null, enrollment: null }
  const enrollment = await db.studentEnrollment.findFirst({
    where: { studentId, sessionId: session.id, isActive: true },
    select: { class: { select: { id: true, name: true, section: true } } },
  })
  return { session, enrollment }
}

/** Every announcement this student may see (newest first). Same rule as the dashboard, without the small limit. */
export async function loadStudentAnnouncements(studentId: string, now: Date): Promise<StudentAnnouncementItem[]> {
  const { enrollment } = await currentEnrollment(studentId)
  const rows = await db.announcement.findMany({
    where: visibleAnnouncementsWhere(enrollment?.class.id, now),
    orderBy: [{ publishedAt: { sort: "desc", nulls: "last" } }, { createdAt: "desc" }],
    take: 100,
    select: { title: true, content: true, publishedAt: true, expiresAt: true, targetClass: { select: { name: true } } },
  })
  return rows.map((a) => ({
    title: a.title,
    content: a.content,
    publishedAt: a.publishedAt,
    expiresAt: a.expiresAt,
    category: a.targetClass ? ("Class" as const) : ("School-wide" as const),
    className: a.targetClass?.name ?? null,
  }))
}

/** The student's own profile. Selects named fields only (never the password hash, sessions or IDs). */
export async function loadStudentProfile(studentId: string): Promise<StudentProfile | null> {
  const student = await db.student.findUnique({
    where: { id: studentId },
    select: { admissionNumber: true, user: { select: { firstName: true, lastName: true, email: true, phone: true } } },
  })
  if (!student) return null
  const { session, enrollment } = await currentEnrollment(studentId)
  return {
    firstName: student.user.firstName,
    lastName: student.user.lastName,
    admissionNumber: student.admissionNumber,
    className: enrollment?.class.name ?? null,
    section: enrollment?.class.section ?? null,
    sessionName: session?.name ?? null,
    email: student.user.email,
    phone: student.user.phone,
  }
}

export async function loadStudentProfileSummary(studentId: string): Promise<StudentProfileSummary | null> {
  const student = await db.student.findUnique({
    where: { id: studentId },
    select: { admissionNumber: true, user: { select: { firstName: true, lastName: true } } },
  })
  if (!student) return null
  return { firstName: student.user.firstName, lastName: student.user.lastName, admissionNumber: student.admissionNumber }
}

export async function loadStudentDashboard(studentId: string, now: Date): Promise<StudentDashboard | null> {
  const profile = await loadStudentProfileSummary(studentId)
  if (!profile) return null

  // 1-2. Current academic session and term (as flagged in the database).
  const session = await db.academicSession.findFirst({ where: { isCurrent: true }, select: { id: true, name: true } })
  const term = session
    ? await db.term.findFirst({ where: { sessionId: session.id, isCurrent: true }, select: { id: true, name: true } })
    : null

  // 3. This student's class in the current session.
  const enrollment = session
    ? await db.studentEnrollment.findFirst({
        where: { studentId, sessionId: session.id, isActive: true },
        select: { class: { select: { id: true, name: true, section: true } } },
      })
    : null

  // 4-6. This student's result for the current term: status only.
  let result: StudentResultStatus
  if (!session || !term) {
    result = { state: "NO_TERM" }
  } else if (!enrollment) {
    result = { state: "NO_ENROLLMENT" }
  } else {
    const row = await db.result.findUnique({
      where: { studentId_sessionId_termId: { studentId, sessionId: session.id, termId: term.id } },
      select: { status: true, publishedAt: true }, // NOTHING ELSE: no entries, scores, grades or totals
    })
    if (!row) result = { state: "NOT_STARTED" }
    else if (row.status === "PUBLISHED") {
      // A publish date in the future is a data mistake; do not show it (the result itself is still published).
      result = { state: "PUBLISHED", publishedAt: row.publishedAt && row.publishedAt <= now ? row.publishedAt : null }
    }
    else result = { state: "IN_PROGRESS" } // DRAFT or SUBMITTED
  }

  // 7. Announcements this student may see: published, already live, not expired, school-wide or for their own class.
  const classId = enrollment?.class.id
  const announcements = await db.announcement.findMany({
    where: visibleAnnouncementsWhere(classId, now),
    orderBy: [{ publishedAt: { sort: "desc", nulls: "last" } }, { createdAt: "desc" }],
    take: ANNOUNCEMENT_LIMIT,
    select: { title: true, content: true, publishedAt: true, targetClass: { select: { name: true } } },
  })

  return {
    student: profile,
    academic: { sessionName: session?.name ?? null, termName: term?.name ?? null },
    enrollment: enrollment ? { className: enrollment.class.name, section: enrollment.class.section } : null,
    result,
    announcements: announcements.map((a) => ({
      title: a.title,
      excerpt: excerpt(a.content),
      publishedAt: a.publishedAt,
      className: a.targetClass?.name ?? null,
    })),
  }
}
