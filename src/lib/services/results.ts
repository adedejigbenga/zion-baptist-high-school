import "server-only"

import type { Prisma } from "@/generated/prisma/client"
import type { TermName } from "@/generated/prisma/enums"
import { classLabel, termKey, termLabel } from "@/lib/academic"
import { db } from "@/lib/db"
import type { ResultSheet, ResultTermOption, SheetComponent, SheetRow, StudentResultView } from "@/types/results"

/**
 * Result queries and calculations. Reusable by the student pages now and by teacher/admin result screens later.
 *
 * IMPORTANT: functions here take an explicit `studentId`. They do NOT authorize anything. The caller must have
 * established, on the server and from the validated session, that this user may see this student's results.
 * For students that caller is `getStudentResultView()` in ./student.ts, which takes no student ID at all.
 * Pages and components must never call this file directly.
 *
 * Privacy rule: marks are only ever read from a result whose status is PUBLISHED. The status filter is part of the
 * database query itself, so draft and submitted marks are never loaded into memory, let alone sent to a browser.
 */

// ------------------------------------------------------------------------------------------------------
// Which terms can a student open?
// ------------------------------------------------------------------------------------------------------

type TermRef = ResultTermOption & { sessionId: string; termId: string; sessionName: string; termName: TermName; startDate: Date }

/**
 * The terms the student may select: terms of the sessions the student belongs to (by enrolment or by a published
 * result) that have started, plus any term with a published result. Newest first.
 * Only PUBLISHED results are considered, so a draft never makes a term appear.
 */
export async function listAvailableTerms(studentId: string, now: Date): Promise<TermRef[]> {
  const [enrolments, published] = await Promise.all([
    db.studentEnrollment.findMany({ where: { studentId }, select: { sessionId: true } }),
    db.result.findMany({ where: { studentId, status: "PUBLISHED" }, select: { sessionId: true, termId: true } }),
  ])

  const sessionIds = [...new Set([...enrolments.map((e) => e.sessionId), ...published.map((r) => r.sessionId)])]
  if (sessionIds.length === 0) return []
  const publishedTermIds = new Set(published.map((r) => r.termId))

  const sessions = await db.academicSession.findMany({
    where: { id: { in: sessionIds } },
    select: {
      id: true, name: true, isCurrent: true, startDate: true,
      terms: { select: { id: true, name: true, isCurrent: true, startDate: true } },
    },
  })

  const refs: TermRef[] = []
  for (const s of sessions) {
    for (const t of s.terms) {
      if (t.startDate > now && !publishedTermIds.has(t.id)) continue // has not started and nothing published
      refs.push({
        key: termKey(s.name, t.name),
        label: termLabel(s.name, t.name),
        isCurrent: s.isCurrent && t.isCurrent,
        sessionId: s.id, termId: t.id, sessionName: s.name, termName: t.name, startDate: t.startDate,
      })
    }
  }
  return refs.sort((a, b) => b.startDate.getTime() - a.startDate.getTime())
}

/** The current term if the student has it, otherwise the newest available term. */
export function defaultTerm(terms: TermRef[]): TermRef | undefined {
  return terms.find((t) => t.isCurrent) ?? terms[0]
}

// ------------------------------------------------------------------------------------------------------
// A published result
// ------------------------------------------------------------------------------------------------------

const publishedResultSelect = {
  publishedAt: true,
  class: { select: { name: true, section: true } },
  session: { select: { name: true } },
  term: { select: { name: true } },
  student: { select: { admissionNumber: true, user: { select: { firstName: true, lastName: true } } } },
  gradingScheme: {
    select: {
      components: { select: { id: true, name: true, shortName: true, maxScore: true, weight: true, sortOrder: true } },
      gradeBands: { select: { grade: true, minScore: true, maxScore: true, remark: true, sortOrder: true } },
    },
  },
  entries: {
    select: {
      totalScore: true, grade: true, remark: true,
      subject: { select: { name: true } },
      scores: { select: { score: true, assessmentComponentId: true } },
    },
  },
} satisfies Prisma.ResultSelect

export type RawPublishedResult = Prisma.ResultGetPayload<{ select: typeof publishedResultSelect }>

/** The student's PUBLISHED result for one term, or null. A DRAFT/SUBMITTED result is never read: the status is in the query. */
export async function loadPublishedResult(studentId: string, term: Pick<TermRef, "sessionId" | "termId">): Promise<ResultSheet | null> {
  const raw = await db.result.findFirst({
    where: { studentId, sessionId: term.sessionId, termId: term.termId, status: "PUBLISHED" },
    select: publishedResultSelect,
  })
  return raw ? buildResultSheet(raw) : null
}

const round2 = (n: number) => Math.round(n * 100) / 100
const num = (d: { toNumber(): number }) => d.toNumber()

/**
 * Turns a raw published result into the sheet shown to the student. Pure: no database access.
 * Columns come from the result's own grading scheme; totals, grades and remarks are the STORED values (they are snapshots
 * taken when the result was saved, so a later change to the scheme cannot alter an old result); nothing is recalculated.
 */
export function buildResultSheet(raw: RawPublishedResult): ResultSheet {
  const components = [...raw.gradingScheme.components].sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name))
  const bands = [...raw.gradingScheme.gradeBands].sort((a, b) => a.sortOrder - b.sortOrder)

  const sheetComponents: SheetComponent[] = components.map((c) => ({
    shortName: c.shortName, name: c.name, maxScore: num(c.maxScore), weight: num(c.weight),
  }))

  const rows: SheetRow[] = raw.entries
    .map((entry) => {
      const byComponent = new Map(entry.scores.map((s) => [s.assessmentComponentId, num(s.score)]))
      return {
        subject: entry.subject.name,
        scores: components.map((c) => byComponent.get(c.id) ?? null),
        total: entry.totalScore === null ? null : num(entry.totalScore),
        grade: entry.grade,
        remark: entry.remark,
      }
    })
    .sort((a, b) => a.subject.localeCompare(b.subject))

  const totals = rows.map((r) => r.total).filter((t): t is number => t !== null)
  const overallTotal = totals.length ? round2(totals.reduce((sum, t) => sum + t, 0)) : null

  const bandOrder = new Map(bands.map((b, i) => [b.grade, i]))
  const counts = new Map<string, number>()
  for (const r of rows) if (r.grade) counts.set(r.grade, (counts.get(r.grade) ?? 0) + 1)
  const gradeCounts = [...counts.entries()]
    .map(([grade, count]) => ({ grade, count }))
    .sort((a, b) => (bandOrder.get(a.grade) ?? 999) - (bandOrder.get(b.grade) ?? 999) || a.grade.localeCompare(b.grade))

  return {
    student: { firstName: raw.student.user.firstName, lastName: raw.student.user.lastName, admissionNumber: raw.student.admissionNumber },
    className: classLabel(raw.class.name, raw.class.section),
    sessionName: raw.session.name,
    termName: raw.term.name,
    publishedAt: raw.publishedAt,
    components: sheetComponents,
    rows,
    summary: {
      subjectCount: rows.length,
      overallTotal,
      average: overallTotal === null ? null : round2(overallTotal / totals.length),
      gradeCounts,
    },
    gradeKey: bands.map((b) => ({ grade: b.grade, minScore: num(b.minScore), maxScore: num(b.maxScore), remark: b.remark })),
  }
}

// ------------------------------------------------------------------------------------------------------
// The whole page for one student
// ------------------------------------------------------------------------------------------------------

const TERM_KEY_PATTERN = /^[A-Za-z0-9-]{1,40}$/

/**
 * Everything the student result page needs. `termKey` is optional text from the URL: it is only ever matched against
 * this student's own list of terms, so it cannot select anyone else's data.
 */
export async function loadStudentResultView(studentId: string, requestedKey: string | undefined, now: Date): Promise<StudentResultView> {
  const terms = await listAvailableTerms(studentId, now)
  if (terms.length === 0) return { kind: "NO_TERMS" }

  const selected =
    requestedKey === undefined
      ? defaultTerm(terms)
      : TERM_KEY_PATTERN.test(requestedKey)
        ? terms.find((t) => t.key === requestedKey)
        : undefined
  if (!selected) return { kind: "UNKNOWN_TERM" }

  const options: ResultTermOption[] = terms.map(({ key, label, isCurrent }) => ({ key, label, isCurrent }))
  const chosen: ResultTermOption = { key: selected.key, label: selected.label, isCurrent: selected.isCurrent }

  const sheet = await loadPublishedResult(studentId, selected)
  return sheet ? { kind: "PUBLISHED", terms: options, selected: chosen, sheet } : { kind: "NOT_PUBLISHED", terms: options, selected: chosen }
}
