import "server-only"

import type { Prisma } from "@/generated/prisma/client"
import { db } from "@/lib/db"
import { calculateEntry, parseScoreInput } from "@/lib/services/grading"
import {
  loadPeriod,
  loadDefaultScheme,
  loadRosterState,
  listAssignments,
  recordAccessDenied,
  rowState,
  type Actor,
} from "@/lib/services/teacher-workspace"

/**
 * INTERNAL write side of the teacher result workflow. Called only by the Server Action in ./teacher-actions.ts,
 * after the session has been checked (takes `actor` from there).
 *
 * What a teacher can do:
 *   draft   save scores for their assigned class + subject; entries stay DRAFT (editable, invisible to students)
 *   submit  finish them: every student in the class must have complete, valid scores; entries become SUBMITTED
 *           (locked for the teacher, waiting for an administrator)
 * What a teacher can NOT do: publish. Nothing in this file ever sets a Result to PUBLISHED, and there is no
 * "publish" intent. A student's Result moves DRAFT -> SUBMITTED automatically only when EVERY subject of the class has a
 * submitted entry; an administrator publishes it later. Students only ever see PUBLISHED results.
 *
 * All input is untrusted. The class and subject are matched against the teacher's own TeacherAssignment rows for the
 * current session; student admission numbers must be on that class's roster; score names must be components of the
 * grading scheme; every value is re-parsed and every total, grade and remark is recalculated here. Validation happens
 * before any write, and the writes run in one transaction: all or nothing.
 */

export type SaveRequest = {
  classKey: string
  subjectCode: string
  intent: "draft" | "submit"
  /** "first" | "second" | "third" (a term of the current session); empty = the current term. */
  term?: string
  /** admission number -> component shortName -> text typed by the teacher */
  cells: Record<string, Record<string, string>>
}

export type SaveFailure = {
  ok: false
  code: "NO_TERM" | "NO_SCHEME" | "NOT_AUTHORIZED" | "INVALID" | "LOCKED"
  message: string
  /** key = `${admissionNumber}::${componentShortName}` */
  fieldErrors: Record<string, string>
  /** key = admission number */
  rowErrors: Record<string, string>
}

export type SaveSuccess = {
  ok: true
  message: string
  savedStudents: number
  changedEntries: number
  submittedEntries: number
  /** Results that became complete (every subject submitted) and now wait for the administrator. */
  resultsReady: number
}

export type SaveOutcome = SaveSuccess | SaveFailure

const fail = (code: SaveFailure["code"], message: string, extra: Partial<Pick<SaveFailure, "fieldErrors" | "rowErrors">> = {}): SaveFailure => ({
  ok: false, code, message, fieldErrors: extra.fieldErrors ?? {}, rowErrors: extra.rowErrors ?? {},
})

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`

export async function saveSubjectResults(actor: Actor, request: SaveRequest): Promise<SaveOutcome> {
  const chosen = await loadPeriod(request.term || null)
  if (!chosen) {
    if (request.term) {
      await recordAccessDenied(actor, "save", { classKey: request.classKey, subjectCode: request.subjectCode })
      return fail("NOT_AUTHORIZED", "That term is not available for this session.")
    }
    return fail("NO_TERM", "There is no current term, so results cannot be entered yet.")
  }
  const { period } = chosen

  // 1. AUTHORIZATION: is this class + subject one of this teacher's assignments for the current session?
  const assignments = await listAssignments(actor.teacherId, period.sessionId)
  const assignment = assignments.find((a) => a.classKey === request.classKey && a.subjectCode === request.subjectCode)
  if (!assignment) {
    await recordAccessDenied(actor, "save", { classKey: request.classKey, subjectCode: request.subjectCode })
    return fail("NOT_AUTHORIZED", "You are not assigned to this class and subject.")
  }

  const loaded = await loadDefaultScheme()
  if (!loaded) return fail("NO_SCHEME", "No grading scheme has been set up yet.")
  const { scheme } = loaded

  // 2. Roster of THIS class only. Anyone else in the request is refused.
  const roster = await loadRosterState(assignment.classId, assignment.subjectId, period)
  const byAdmission = new Map(roster.map((s) => [s.admissionNumber, s]))
  for (const admission of Object.keys(request.cells)) {
    if (!byAdmission.has(admission)) {
      await recordAccessDenied(actor, "save", { classKey: request.classKey, subjectCode: request.subjectCode, admission })
      return fail("NOT_AUTHORIZED", "The request includes a student who is not in this class.")
    }
  }

  // 3. Only components of the grading scheme may be scored.
  const components = new Map(scheme.components.map((c) => [c.shortName, c]))
  for (const row of Object.values(request.cells)) {
    for (const name of Object.keys(row)) {
      if (!components.has(name)) return fail("INVALID", "The request includes an assessment component that is not part of the grading scheme.")
    }
  }

  // 4. Which students are being saved? Draft: the rows sent. Submit: every student who can still be edited.
  const editable = roster.filter((s) => !rowState(s, loaded.id, assignment.classId).locked)
  const targets = request.intent === "submit" ? editable : roster.filter((s) => request.cells[s.admissionNumber])

  const fieldErrors: Record<string, string> = {}
  const rowErrors: Record<string, string> = {}

  // Rows sent for a locked student (submitted, published, other scheme) are refused, never silently applied.
  for (const admission of Object.keys(request.cells)) {
    const s = byAdmission.get(admission)!
    const state = rowState(s, loaded.id, assignment.classId)
    if (state.locked) rowErrors[admission] = `${state.lockNote ?? "Locked"}. It can no longer be changed here.`
  }

  type Prepared = { student: (typeof roster)[number]; scores: Record<string, number | null>; outcome: ReturnType<typeof calculateEntry> }
  const prepared: Prepared[] = []

  for (const s of targets) {
    if (rowErrors[s.admissionNumber]) continue
    const typed = request.cells[s.admissionNumber] ?? {}
    const scores: Record<string, number | null> = {}
    for (const c of scheme.components) {
      // For a student who was not sent (submit with an untouched row) fall back to the saved score.
      const text = typed[c.shortName] ?? (s.entry?.scores[c.shortName] !== undefined ? String(s.entry.scores[c.shortName]) : "")
      const parsed = parseScoreInput(text, c.maxScore)
      if (!parsed.ok) {
        fieldErrors[`${s.admissionNumber}::${c.shortName}`] = parsed.error
        scores[c.shortName] = null
        continue
      }
      scores[c.shortName] = parsed.value
      if (request.intent === "submit" && parsed.value === null) fieldErrors[`${s.admissionNumber}::${c.shortName}`] = "Required to submit."
    }
    const outcome = calculateEntry(scheme, scores)
    if (request.intent === "submit" && outcome.complete && outcome.gradeMissing) {
      rowErrors[s.admissionNumber] = `No grade band covers a total of ${outcome.total}. Please tell the administrator.`
    }
    prepared.push({ student: s, scores, outcome })
  }

  if (Object.keys(fieldErrors).length > 0 || Object.keys(rowErrors).length > 0) {
    const locked = Object.keys(rowErrors).some((a) => rowRankLocked(byAdmission.get(a)!, loaded.id, assignment.classId))
    return fail(
      locked ? "LOCKED" : "INVALID",
      request.intent === "submit"
        ? "Some results are incomplete or invalid. Nothing was submitted. Fix the highlighted scores and try again."
        : "Some scores are invalid. Nothing was saved. Fix the highlighted scores and try again.",
      { fieldErrors, rowErrors },
    )
  }

  if (request.intent === "submit" && prepared.length === 0) {
    return fail("INVALID", "There is nothing left to submit for this class and subject.")
  }

  // 5. WRITE (all or nothing)
  const meta = {
    class: assignment.className, subject: assignment.subjectCode, term: period.termName, session: period.sessionName,
  }
  const submitting = request.intent === "submit"
  let changedEntries = 0
  let submittedEntries = 0
  let resultsReady = 0
  let savedStudents = 0

  await db.$transaction(
    async (tx) => {
      const audit: Prisma.AuditLogCreateManyInput[] = []
      const requiredSubjectIds = submitting
        ? (await tx.classSubject.findMany({ where: { classId: assignment.classId, sessionId: period.sessionId }, select: { subjectId: true } })).map((c) => c.subjectId)
        : []

      for (const { student, scores, outcome } of prepared) {
        const hasAnyScore = Object.values(scores).some((v) => v !== null)
        // Nothing typed and nothing saved before: do not create an empty entry.
        if (!submitting && !hasAnyScore && !student.entry) continue
        savedStudents += 1

        const old = student.entry?.scores ?? {}
        const changes = scheme.components
          .filter((c) => (old[c.shortName] ?? null) !== scores[c.shortName])
          .map((c) => ({ component: c.shortName, from: old[c.shortName] ?? null, to: scores[c.shortName] }))
        const statusChange = submitting && student.entry?.status !== "SUBMITTED"
        if (changes.length === 0 && !statusChange && student.entry) continue

        const result = await tx.result.upsert({
          where: { studentId_sessionId_termId: { studentId: student.studentId, sessionId: period.sessionId, termId: period.termId } },
          create: {
            studentId: student.studentId, sessionId: period.sessionId, termId: period.termId,
            classId: assignment.classId, gradingSchemeId: loaded.id, status: "DRAFT",
          },
          update: {},
          select: { id: true, status: true },
        })

        const entry = await tx.resultEntry.upsert({
          where: { resultId_subjectId: { resultId: result.id, subjectId: assignment.subjectId } },
          create: {
            resultId: result.id, subjectId: assignment.subjectId,
            totalScore: outcome.total, grade: outcome.grade, remark: outcome.remark, status: submitting ? "SUBMITTED" : "DRAFT",
          },
          update: { totalScore: outcome.total, grade: outcome.grade, remark: outcome.remark, status: submitting ? "SUBMITTED" : "DRAFT" },
          select: { id: true },
        })

        for (const c of scheme.components) {
          const value = scores[c.shortName]
          const componentId = loaded.componentIds.get(c.shortName)!
          if (value === null) {
            await tx.resultEntryScore.deleteMany({ where: { resultEntryId: entry.id, assessmentComponentId: componentId } })
          } else {
            await tx.resultEntryScore.upsert({
              where: { resultEntryId_assessmentComponentId: { resultEntryId: entry.id, assessmentComponentId: componentId } },
              create: { resultEntryId: entry.id, assessmentComponentId: componentId, score: value },
              update: { score: value },
            })
          }
        }

        changedEntries += 1
        if (changes.length > 0) {
          audit.push({
            userId: actor.userId, action: "TEACHER_SCORE_CHANGED", entityType: "ResultEntry", entityId: entry.id,
            metadata: { ...meta, admissionNumber: student.admissionNumber, changes },
          })
        }

        if (submitting) {
          submittedEntries += 1
          // The student's result is complete when EVERY subject the class takes has a submitted entry.
          const submitted = await tx.resultEntry.findMany({ where: { resultId: result.id, status: "SUBMITTED" }, select: { subjectId: true } })
          const have = new Set(submitted.map((e) => e.subjectId))
          if (result.status === "DRAFT" && requiredSubjectIds.length > 0 && requiredSubjectIds.every((id) => have.has(id))) {
            await tx.result.update({ where: { id: result.id }, data: { status: "SUBMITTED" } })
            resultsReady += 1
            audit.push({
              userId: actor.userId, action: "RESULT_READY_FOR_REVIEW", entityType: "Result", entityId: result.id,
              metadata: { ...meta, admissionNumber: student.admissionNumber },
            })
          }
        }
      }

      if (submitting) {
        audit.push({
          userId: actor.userId, action: "TEACHER_RESULT_SUBMITTED", entityType: "ResultEntry", entityId: null,
          metadata: { ...meta, students: submittedEntries, resultsReady },
        })
      } else if (changedEntries > 0) {
        audit.push({
          userId: actor.userId, action: "TEACHER_RESULT_DRAFT_SAVED", entityType: "ResultEntry", entityId: null,
          metadata: { ...meta, students: savedStudents, changedEntries },
        })
      }
      if (audit.length > 0) await tx.auditLog.createMany({ data: audit })
    },
    { timeout: 30_000, maxWait: 10_000 },
  )

  if (submitting) {
    return {
      ok: true, savedStudents, changedEntries, submittedEntries, resultsReady,
      message:
        `Submitted ${plural(submittedEntries, "student result")} for ${assignment.className}, ${assignment.subjectName}. ` +
        `They are now awaiting administrative publication and can no longer be edited here.` +
        (resultsReady > 0 ? ` ${plural(resultsReady, "student result")} now ${resultsReady === 1 ? "has" : "have"} every subject submitted and ${resultsReady === 1 ? "is" : "are"} ready for review.` : ""),
    }
  }
  return {
    ok: true, savedStudents, changedEntries, submittedEntries, resultsReady,
    message: changedEntries === 0 ? "No changes to save." : `Draft saved for ${plural(changedEntries, "student")}. Students cannot see drafts.`,
  }
}

function rowRankLocked(s: Parameters<typeof rowState>[0], schemeId: string, classId: string) {
  return rowState(s, schemeId, classId).locked
}
