import "server-only"

import { createHash } from "node:crypto"

import type { EntryStatus, ResultStatus, TermName } from "@/generated/prisma/enums"
import { classKey, classLabel } from "@/lib/academic"
import { db } from "@/lib/db"
import type { GradingScheme } from "@/lib/services/grading"
import type {
  AssignmentStatus,
  RowStatus,
  TeacherAssignmentSummary,
  TeacherOverview,
  TeacherWorkspace,
  WorkspaceOption,
  WorkspaceRow,
} from "@/types/teacher"

/**
 * INTERNAL teacher data layer (read side; the write side is teacher-results.ts).
 *
 * Every function takes an explicit `teacherId`/`actor` that the caller has already taken from the validated session.
 * Pages never import this file: they use the session-bound functions in ./teacher.ts, which accept no teacher ID.
 * (Tests import this file directly.)
 *
 * THE AUTHORIZATION RULE: a teacher may touch a class and subject only if a TeacherAssignment row says so for the
 * CURRENT session. The browser only ever supplies a class key ("jss-1") and a subject code ("MTH"); they are matched
 * against the teacher's own assignment list here and the real IDs come from that match, never from the request.
 */

export type Actor = { teacherId: string; userId: string }

// ------------------------------------------------------------------------------------------------------
// Current period, assignments, grading scheme
// ------------------------------------------------------------------------------------------------------

export type CurrentPeriod = { sessionId: string; sessionName: string; termId: string; termName: TermName }

export async function loadCurrentPeriod(): Promise<CurrentPeriod | null> {
  const session = await db.academicSession.findFirst({ where: { isCurrent: true }, select: { id: true, name: true } })
  if (!session) return null
  const term = await db.term.findFirst({ where: { sessionId: session.id, isCurrent: true }, select: { id: true, name: true } })
  if (!term) return null
  return { sessionId: session.id, sessionName: session.name, termId: term.id, termName: term.name }
}

export type AssignmentRef = {
  classId: string
  classKey: string
  className: string
  subjectId: string
  subjectCode: string
  subjectName: string
}

/** The teacher's assignments for one session, ordered by class level then subject name. */
export async function listAssignments(teacherId: string, sessionId: string): Promise<AssignmentRef[]> {
  const rows = await db.teacherAssignment.findMany({
    where: { teacherId, sessionId },
    select: {
      class: { select: { id: true, name: true, section: true, level: true } },
      subject: { select: { id: true, code: true, name: true } },
    },
  })
  return rows
    .sort((a, b) => a.class.level - b.class.level || (a.class.section ?? "").localeCompare(b.class.section ?? "") || a.subject.name.localeCompare(b.subject.name))
    .map((r) => ({
      classId: r.class.id,
      classKey: classKey(r.class.name, r.class.section),
      className: classLabel(r.class.name, r.class.section),
      subjectId: r.subject.id,
      subjectCode: r.subject.code,
      subjectName: r.subject.name,
    }))
}

export type LoadedScheme = { id: string; scheme: GradingScheme; componentIds: Map<string, string> }

/** The default grading scheme with its components and grade bands. Everything the UI and the calculations use. */
export async function loadDefaultScheme(): Promise<LoadedScheme | null> {
  const s = await db.gradingScheme.findFirst({
    where: { isDefault: true },
    select: {
      id: true,
      components: { orderBy: { sortOrder: "asc" }, select: { id: true, name: true, shortName: true, maxScore: true, weight: true } },
      gradeBands: { orderBy: { sortOrder: "asc" }, select: { grade: true, minScore: true, maxScore: true, remark: true } },
    },
  })
  if (!s) return null
  return {
    id: s.id,
    componentIds: new Map(s.components.map((c) => [c.shortName, c.id])),
    scheme: {
      components: s.components.map((c) => ({ shortName: c.shortName, name: c.name, maxScore: c.maxScore.toNumber(), weight: c.weight.toNumber() })),
      bands: s.gradeBands.map((b) => ({ grade: b.grade, minScore: b.minScore.toNumber(), maxScore: b.maxScore.toNumber(), remark: b.remark })),
    },
  }
}

// ------------------------------------------------------------------------------------------------------
// Audit of refused attempts
// ------------------------------------------------------------------------------------------------------

/** Records an attempt to reach a class, subject or student that is not the teacher's. Attacker-supplied text is truncated. */
export async function recordAccessDenied(actor: Actor, attempt: "view" | "save", detail: { classKey?: string; subjectCode?: string; admission?: string }) {
  const cut = (v?: string) => (v === undefined ? null : v.slice(0, 60))
  await db.auditLog.create({
    data: {
      userId: actor.userId,
      action: "TEACHER_ACCESS_DENIED",
      entityType: "TeacherAssignment",
      metadata: { attempt, classKey: cut(detail.classKey), subjectCode: cut(detail.subjectCode), admission: cut(detail.admission) },
    },
  })
}

// ------------------------------------------------------------------------------------------------------
// Roster state: the students of one class with this subject's entry
// ------------------------------------------------------------------------------------------------------

export type RosterStudent = {
  studentId: string
  admissionNumber: string
  firstName: string
  lastName: string
  result: { id: string; status: ResultStatus; gradingSchemeId: string; classId: string } | null
  entry: { id: string; status: EntryStatus; total: number | null; grade: string | null; remark: string | null; scores: Record<string, number> } | null
}

/**
 * Students actively enrolled in `classId` for the session, each with their result and ONLY this subject's entry.
 * Other subjects' entries are never loaded, so a teacher cannot see a colleague's marks.
 */
export async function loadRosterState(classId: string, subjectId: string, period: CurrentPeriod): Promise<RosterStudent[]> {
  const enrolments = await db.studentEnrollment.findMany({
    where: { classId, sessionId: period.sessionId, isActive: true },
    select: { student: { select: { id: true, admissionNumber: true, user: { select: { firstName: true, lastName: true } } } } },
  })
  const students = enrolments.map((e) => e.student)
  if (students.length === 0) return []

  const results = await db.result.findMany({
    where: { sessionId: period.sessionId, termId: period.termId, studentId: { in: students.map((s) => s.id) } },
    select: {
      id: true, studentId: true, status: true, gradingSchemeId: true, classId: true,
      entries: {
        where: { subjectId },
        select: {
          id: true, status: true, totalScore: true, grade: true, remark: true,
          scores: { select: { score: true, assessmentComponent: { select: { shortName: true } } } },
        },
      },
    },
  })
  const byStudent = new Map(results.map((r) => [r.studentId, r]))

  return students
    .map((s): RosterStudent => {
      const r = byStudent.get(s.id)
      const e = r?.entries[0]
      return {
        studentId: s.id,
        admissionNumber: s.admissionNumber,
        firstName: s.user.firstName,
        lastName: s.user.lastName,
        result: r ? { id: r.id, status: r.status, gradingSchemeId: r.gradingSchemeId, classId: r.classId } : null,
        entry: e
          ? {
              id: e.id, status: e.status, total: e.totalScore?.toNumber() ?? null, grade: e.grade, remark: e.remark,
              scores: Object.fromEntries(e.scores.map((x) => [x.assessmentComponent.shortName, x.score.toNumber()])),
            }
          : null,
      }
    })
    .sort((a, b) => a.lastName.localeCompare(b.lastName) || a.firstName.localeCompare(b.firstName))
}

/** Can the teacher edit this student's entry, and how should its state be described? */
export function rowState(s: RosterStudent, schemeId: string, classId: string): { status: RowStatus; locked: boolean; lockNote: string | null } {
  const status: RowStatus = s.result?.status === "PUBLISHED" ? "PUBLISHED" : s.entry?.status === "SUBMITTED" ? "SUBMITTED" : s.entry ? "DRAFT" : "NOT_STARTED"
  if (status === "PUBLISHED") return { status, locked: true, lockNote: "Published" }
  if (status === "SUBMITTED") return { status, locked: true, lockNote: "Submitted: awaiting administrative publication" }
  if (s.result && s.result.gradingSchemeId !== schemeId) return { status, locked: true, lockNote: "Started under a different grading scheme. Ask the administrator." }
  if (s.result && s.result.classId !== classId) return { status, locked: true, lockNote: "This result belongs to another class. Ask the administrator." }
  return { status, locked: false, lockNote: null }
}

/**
 * Search within an already-authorized roster, by student name or admission number. Every word typed must match the
 * first name, last name or admission number (so "ade dan" finds Daniel Ade). It only ever sees the rows it is given,
 * so it cannot return a student the teacher is not allowed to see.
 */
export function filterRoster<T extends { firstName: string; lastName: string; admissionNumber: string }>(rows: T[], query: string): T[] {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean).slice(0, 5)
  if (words.length === 0) return rows
  return rows.filter((r) => {
    const fields = [r.firstName, r.lastName, r.admissionNumber].map((f) => f.toLowerCase())
    return words.every((w) => fields.some((f) => f.includes(w)))
  })
}

// ------------------------------------------------------------------------------------------------------
// The results workspace (class + subject + students + scores)
// ------------------------------------------------------------------------------------------------------

const MAX_QUERY = 60

export async function loadWorkspace(
  actor: Actor,
  params: { classKey?: string; subjectCode?: string; query?: string },
): Promise<TeacherWorkspace> {
  const period = await loadCurrentPeriod()
  if (!period) return { kind: "NO_TERM" }

  const assignments = await listAssignments(actor.teacherId, period.sessionId)
  if (assignments.length === 0) return { kind: "NO_ASSIGNMENTS", sessionName: period.sessionName, termName: period.termName }

  const scheme = await loadDefaultScheme()
  if (!scheme) return { kind: "NO_SCHEME" }

  // Pick the assignment. Nothing requested -> the first one. Otherwise the request must match one of the teacher's own.
  const wantsClass = params.classKey !== undefined && params.classKey !== ""
  const wantsSubject = params.subjectCode !== undefined && params.subjectCode !== ""
  const selected =
    !wantsClass && !wantsSubject
      ? assignments[0]
      : assignments.find((a) => (!wantsClass || a.classKey === params.classKey) && (!wantsSubject || a.subjectCode === params.subjectCode))
  if (!selected) {
    await recordAccessDenied(actor, "view", { classKey: params.classKey, subjectCode: params.subjectCode })
    return { kind: "NOT_AUTHORIZED" }
  }

  const options: WorkspaceOption[] = []
  for (const a of assignments) {
    const existing = options.find((o) => o.classKey === a.classKey)
    const subject = { code: a.subjectCode, name: a.subjectName }
    if (existing) existing.subjects.push(subject)
    else options.push({ classKey: a.classKey, className: a.className, subjects: [subject] })
  }

  const roster = await loadRosterState(selected.classId, selected.subjectId, period)
  const allRows: WorkspaceRow[] = roster.map((s) => {
    const state = rowState(s, scheme.id, selected.classId)
    return {
      admissionNumber: s.admissionNumber,
      firstName: s.firstName,
      lastName: s.lastName,
      scores: Object.fromEntries(scheme.scheme.components.map((c) => [c.shortName, s.entry?.scores[c.shortName] ?? null])),
      total: s.entry?.total ?? null,
      grade: s.entry?.grade ?? null,
      remark: s.entry?.remark ?? null,
      ...state,
    }
  })

  const query = (params.query ?? "").trim().slice(0, MAX_QUERY)
  const counts = {
    notStarted: allRows.filter((r) => r.status === "NOT_STARTED").length,
    drafts: allRows.filter((r) => r.status === "DRAFT").length,
    submitted: allRows.filter((r) => r.status === "SUBMITTED").length,
    published: allRows.filter((r) => r.status === "PUBLISHED").length,
  }

  return {
    kind: "READY",
    sessionName: period.sessionName,
    termName: period.termName,
    options,
    selected: { classKey: selected.classKey, className: selected.className, subjectCode: selected.subjectCode, subjectName: selected.subjectName },
    scheme: scheme.scheme,
    rows: filterRoster(allRows, query),
    totalStudents: allRows.length,
    query,
    counts,
    editableCount: allRows.filter((r) => !r.locked).length,
    version: createHash("sha1").update(JSON.stringify(allRows)).digest("hex").slice(0, 12),
  }
}

// ------------------------------------------------------------------------------------------------------
// Dashboard / My Classes
// ------------------------------------------------------------------------------------------------------

export function assignmentStatus(c: { studentCount: number; drafts: number; submitted: number; published: number }): AssignmentStatus {
  if (c.studentCount === 0) return "NO_STUDENTS"
  if (c.published >= c.studentCount) return "PUBLISHED"
  if (c.submitted + c.published >= c.studentCount) return "SUBMITTED"
  if (c.drafts + c.submitted + c.published > 0) return "IN_PROGRESS"
  return "NOT_STARTED"
}

export async function loadTeacherOverview(teacherId: string): Promise<TeacherOverview> {
  const period = await loadCurrentPeriod()
  if (!period) return { sessionName: null, termName: null, assignments: [], totals: { classes: 0, subjects: 0, pending: 0, submitted: 0 } }

  const assignments = await listAssignments(teacherId, period.sessionId)
  const classIds = [...new Set(assignments.map((a) => a.classId))]
  const subjectIds = [...new Set(assignments.map((a) => a.subjectId))]

  const [enrolmentCounts, entries] = await Promise.all([
    db.studentEnrollment.groupBy({ by: ["classId"], where: { sessionId: period.sessionId, isActive: true, classId: { in: classIds } }, _count: { _all: true } }),
    db.resultEntry.findMany({
      where: { subjectId: { in: subjectIds }, result: { sessionId: period.sessionId, termId: period.termId, classId: { in: classIds } } },
      select: { subjectId: true, status: true, result: { select: { classId: true, status: true } } },
    }),
  ])
  const students = new Map(enrolmentCounts.map((c) => [c.classId, c._count._all]))

  const summaries: TeacherAssignmentSummary[] = assignments.map((a) => {
    const mine = entries.filter((e) => e.subjectId === a.subjectId && e.result.classId === a.classId)
    const published = mine.filter((e) => e.result.status === "PUBLISHED").length
    const submitted = mine.filter((e) => e.result.status !== "PUBLISHED" && e.status === "SUBMITTED").length
    const drafts = mine.filter((e) => e.result.status !== "PUBLISHED" && e.status === "DRAFT").length
    const studentCount = students.get(a.classId) ?? 0
    const counts = { studentCount, drafts, submitted, published }
    return {
      classKey: a.classKey, className: a.className, subjectCode: a.subjectCode, subjectName: a.subjectName,
      studentCount, drafts, submitted, published,
      notStarted: Math.max(0, studentCount - drafts - submitted - published),
      status: assignmentStatus(counts),
    }
  })

  return {
    sessionName: period.sessionName,
    termName: period.termName,
    assignments: summaries,
    totals: {
      classes: classIds.length,
      subjects: subjectIds.length,
      pending: summaries.reduce((sum, s) => sum + s.notStarted + s.drafts, 0),
      submitted: summaries.reduce((sum, s) => sum + s.submitted + s.published, 0),
    },
  }
}

export async function loadTeacherProfileSummary(teacherId: string): Promise<{ firstName: string; lastName: string; employeeNumber: string } | null> {
  const t = await db.teacher.findUnique({
    where: { id: teacherId },
    select: { employeeNumber: true, user: { select: { firstName: true, lastName: true } } },
  })
  return t ? { firstName: t.user.firstName, lastName: t.user.lastName, employeeNumber: t.employeeNumber } : null
}
