import { classKey } from "@/lib/academic"
import { db } from "@/lib/db"
import type { Prisma } from "@/generated/prisma/client"
import { summarizeMetadata } from "@/lib/audit-summary"
import type {
  AcademicsView,
  AdminOverview,
  AuditRow,
  ClassRow,
  Paged,
  StudentRow,
  SubjectRow,
  TeacherRow,
} from "@/types/admin"

/**
 * Read-only school directory data for the admin pages (internal; reached only through `admin.ts`, which requires an ADMIN
 * session). Nothing here exposes password hashes, session tokens or token hashes: those columns are never selected.
 */

export const PAGE_SIZE = 20

function paged<T>(rows: T[], total: number, page: number): Paged<T> {
  return { rows, total, page, pageCount: Math.max(1, Math.ceil(total / PAGE_SIZE)), pageSize: PAGE_SIZE }
}

const clampPage = (page: number, total: number) => Math.min(Math.max(1, page), Math.max(1, Math.ceil(total / PAGE_SIZE)))

/** Each word of the query must match the first name, last name or `idField` (case-insensitive). */
function nameSearch(query: string, idField: "admissionNumber" | "employeeNumber") {
  const words = query.trim().split(/\s+/).filter(Boolean).slice(0, 5)
  return words.map((w) => ({
    OR: [
      { user: { firstName: { contains: w, mode: "insensitive" as const } } },
      { user: { lastName: { contains: w, mode: "insensitive" as const } } },
      { [idField]: { contains: w, mode: "insensitive" as const } },
    ],
  }))
}

export async function loadAdminOverview(): Promise<AdminOverview> {
  const session = await db.academicSession.findFirst({ where: { isCurrent: true }, select: { name: true } })
  const term = await db.term.findFirst({ where: { isCurrent: true }, select: { name: true } })
  const [totalStudents, totalTeachers, activeClasses, totalSubjects, awaitingPublication, publishedResults, announcements, recent] = await Promise.all([
    db.student.count({ where: { user: { isActive: true } } }),
    db.teacher.count({ where: { user: { isActive: true } } }),
    db.schoolClass.count({ where: { isActive: true } }),
    db.subject.count({ where: { isActive: true } }),
    db.result.count({ where: { status: "SUBMITTED" } }),
    db.result.count({ where: { status: "PUBLISHED" } }),
    db.announcement.findMany({ orderBy: { updatedAt: "desc" }, take: 4, select: { title: true, isPublished: true, updatedAt: true, targetClass: { select: { name: true, section: true } } } }),
    loadAuditLogs({ page: 1, action: "", entityType: "" }, 6),
  ])
  return {
    sessionName: session?.name ?? null,
    termName: term?.name ?? null,
    totalStudents,
    totalTeachers,
    activeClasses,
    totalSubjects,
    awaitingPublication,
    publishedResults,
    recentAnnouncements: announcements.map((a) => ({ title: a.title, target: a.targetClass ? (a.targetClass.section ? `${a.targetClass.name} ${a.targetClass.section}` : a.targetClass.name) : "Whole school", published: a.isPublished, updatedAt: a.updatedAt })),
    recent: recent.rows,
  }
}

export type DirectoryFilters = { status?: string; classKey?: string }

const activeFilter = (status?: string) => (status === "active" ? { isActive: true } : status === "inactive" ? { isActive: false } : {})

export async function loadStudents(query: string, page: number, filters: DirectoryFilters = {}): Promise<Paged<StudentRow>> {
  const session = await db.academicSession.findFirst({ where: { isCurrent: true }, select: { id: true, name: true } })
  let classFilter: Prisma.StudentWhereInput = {}
  if (filters.classKey && session) {
    const classes = await db.schoolClass.findMany({ select: { id: true, name: true, section: true } })
    const match = classes.find((c) => classKey(c.name, c.section) === filters.classKey)
    // An unknown class key matches nobody (rather than being ignored).
    classFilter = { enrollments: { some: { sessionId: session.id, isActive: true, classId: match?.id ?? "none" } } }
  }
  const where: Prisma.StudentWhereInput = { AND: nameSearch(query, "admissionNumber"), user: activeFilter(filters.status), ...classFilter }
  const total = await db.student.count({ where })
  const current = clampPage(page, total)
  const students = await db.student.findMany({
    where,
    orderBy: [{ user: { lastName: "asc" } }, { user: { firstName: "asc" } }],
    skip: (current - 1) * PAGE_SIZE,
    take: PAGE_SIZE,
    select: {
      admissionNumber: true,
      user: { select: { firstName: true, lastName: true, isActive: true } },
      enrollments: session
        ? { where: { sessionId: session.id, isActive: true }, select: { class: { select: { name: true, section: true } } }, take: 1 }
        : { where: { id: "none" }, select: { class: { select: { name: true, section: true } } } },
    },
  })
  return paged(
    students.map((s) => {
      const c = s.enrollments[0]?.class
      return {
        name: `${s.user.firstName} ${s.user.lastName}`,
        admissionNumber: s.admissionNumber,
        className: c ? (c.section ? `${c.name} ${c.section}` : c.name) : null,
        sessionName: c ? (session?.name ?? null) : null,
        active: s.user.isActive,
      }
    }),
    total,
    current,
  )
}

export async function loadTeachers(query: string, page: number, filters: DirectoryFilters = {}): Promise<Paged<TeacherRow>> {
  const where: Prisma.TeacherWhereInput = { AND: nameSearch(query, "employeeNumber"), user: activeFilter(filters.status) }
  const total = await db.teacher.count({ where })
  const current = clampPage(page, total)
  const teachers = await db.teacher.findMany({
    where,
    orderBy: [{ user: { lastName: "asc" } }, { user: { firstName: "asc" } }],
    skip: (current - 1) * PAGE_SIZE,
    take: PAGE_SIZE,
    select: { employeeNumber: true, department: true, user: { select: { loginId: true, firstName: true, lastName: true, isActive: true } }, _count: { select: { assignments: true } } },
  })
  return paged(
    teachers.map((t) => ({
      name: `${t.user.firstName} ${t.user.lastName}`,
      loginId: t.user.loginId,
      employeeNumber: t.employeeNumber,
      department: t.department,
      assignmentCount: t._count.assignments,
      active: t.user.isActive,
    })),
    total,
    current,
  )
}

export async function loadClasses(): Promise<ClassRow[]> {
  const session = await db.academicSession.findFirst({ where: { isCurrent: true }, select: { id: true } })
  const classes = await db.schoolClass.findMany({
    orderBy: [{ level: "asc" }, { name: "asc" }, { section: "asc" }],
    select: {
      name: true,
      section: true,
      level: true,
      isActive: true,
      _count: { select: { enrollments: { where: { sessionId: session?.id ?? "none", isActive: true } } } },
    },
  })
  return classes.map((c) => ({ name: c.name, section: c.section, level: c.level, active: c.isActive, studentCount: c._count.enrollments }))
}

export async function loadSubjects(): Promise<SubjectRow[]> {
  return db.subject.findMany({ orderBy: { name: "asc" }, select: { name: true, code: true, isActive: true } }).then((rows) =>
    rows.map((s) => ({ name: s.name, code: s.code, active: s.isActive })),
  )
}

export async function loadAcademics(): Promise<AcademicsView> {
  const sessions = await db.academicSession.findMany({
    orderBy: { startDate: "desc" },
    select: {
      name: true,
      startDate: true,
      endDate: true,
      isCurrent: true,
      terms: { orderBy: { startDate: "asc" }, select: { name: true, startDate: true, endDate: true, isCurrent: true } },
    },
  })
  return { sessions }
}

export type AuditFilter = { page: number; action: string; entityType: string }

export async function loadAuditFilterOptions(): Promise<{ actions: string[]; entityTypes: string[] }> {
  const [actions, entityTypes] = await Promise.all([
    db.auditLog.findMany({ distinct: ["action"], select: { action: true }, orderBy: { action: "asc" } }),
    db.auditLog.findMany({ distinct: ["entityType"], select: { entityType: true }, orderBy: { entityType: "asc" } }),
  ])
  return { actions: actions.map((a) => a.action), entityTypes: entityTypes.map((e) => e.entityType) }
}

/** Audit rows, newest first. `metadata` is reduced to a safe one-line summary here, so raw JSON never leaves this function. */
export async function loadAuditLogs(filter: AuditFilter, pageSize = PAGE_SIZE): Promise<Paged<AuditRow>> {
  const where: Prisma.AuditLogWhereInput = {
    ...(filter.action ? { action: filter.action } : {}),
    ...(filter.entityType ? { entityType: filter.entityType } : {}),
  }
  const total = await db.auditLog.count({ where })
  const pageCount = Math.max(1, Math.ceil(total / pageSize))
  const page = Math.min(Math.max(1, filter.page), pageCount)
  const logs = await db.auditLog.findMany({
    where,
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    skip: (page - 1) * pageSize,
    take: pageSize,
    select: {
      id: true,
      createdAt: true,
      action: true,
      entityType: true,
      entityId: true,
      metadata: true,
      user: { select: { firstName: true, lastName: true, loginId: true } },
    },
  })
  return {
    rows: logs.map((l) => ({
      id: l.id,
      createdAt: l.createdAt,
      userName: l.user ? `${l.user.firstName} ${l.user.lastName}` : null,
      userLoginId: l.user?.loginId ?? null,
      action: l.action,
      entityType: l.entityType,
      entityId: l.entityId,
      summary: summarizeMetadata(l.metadata),
    })),
    total,
    page,
    pageCount,
    pageSize,
  }
}
