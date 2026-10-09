import { db } from "@/lib/db"
import type { Prisma, ResultStatus } from "@/generated/prisma/client"
import { classKey, classLabel, termKey, termLabel } from "@/lib/academic"
import { isActiveAdmin, recordAdminDenied } from "@/lib/services/admin-guard"
import type { GradingScheme } from "@/lib/services/grading"
import { evaluateResult, type EntrySnapshot, type RequiredSubject } from "@/lib/services/result-completeness"
import type { AdminResultRow, FilterOptions, ResultFilters, ResultList, ResultReview } from "@/types/admin"

/**
 * Result administration (internal). These functions take the acting admin's user ID and a result named by admission number
 * plus term key, never by database ID. They are only reached through `admin.ts` / `admin-actions.ts`, which require an
 * ADMIN session; `publishResult` and `unpublishResult` ALSO re-check in the database that the actor is an active admin
 * (defence in depth), so even a wrongly wired caller cannot publish as a teacher or student.
 *
 * Publishing rules:
 *   - only a SUBMITTED result can be published (every subject submitted by its teacher);
 *   - it must still be complete under `evaluateResult` (class subjects x grading-scheme components), re-checked inside the
 *     same transaction that publishes it;
 *   - the status change is a guarded update (`WHERE status = 'SUBMITTED'`), so two admins cannot both publish it.
 * Unpublishing returns the result to SUBMITTED (it stays complete and ready, but students lose access immediately) and keeps
 * every score. Nothing is ever deleted.
 */

export const PAGE_SIZE = 20

const STATUS_ORDER: Record<ResultStatus, number> = { SUBMITTED: 0, DRAFT: 1, PUBLISHED: 2 }
const TERM_BY_KEY = { first: "FIRST", second: "SECOND", third: "THIRD" } as const

type Client = Pick<typeof db, "term" | "result" | "classSubject" | "user">

export type AdminActor = { userId: string }

export type PublishOutcome =
  | { ok: true; message: string }
  | { ok: false; code: "NOT_AUTHORIZED" | "NOT_FOUND" | "INCOMPLETE" | "NOT_READY" | "ALREADY" | "CHANGED" | "INVALID"; message: string; issues?: string[] }

const sessionKey = (name: string) => name.replace(/[^A-Za-z0-9]+/g, "-")

// ---------------------------------------------------------------------------------------------------------
// Filters and list
// ---------------------------------------------------------------------------------------------------------

export async function loadFilterOptions(): Promise<FilterOptions & { currentSession: string | null; currentTerm: string | null }> {
  const [sessions, classes, subjects, currentTerm] = await Promise.all([
    db.academicSession.findMany({ orderBy: { startDate: "desc" }, select: { name: true, isCurrent: true } }),
    db.schoolClass.findMany({ orderBy: [{ level: "asc" }, { name: "asc" }, { section: "asc" }], select: { name: true, section: true } }),
    db.subject.findMany({ orderBy: { name: "asc" }, select: { code: true, name: true } }),
    db.term.findFirst({ where: { isCurrent: true }, select: { name: true } }),
  ])
  return {
    sessions: sessions.map((s) => ({ key: sessionKey(s.name), name: s.name })),
    classes: classes.map((c) => ({ key: classKey(c.name, c.section), label: classLabel(c.name, c.section) })),
    subjects,
    currentSession: sessions.find((s) => s.isCurrent) ? sessionKey(sessions.find((s) => s.isCurrent)!.name) : null,
    currentTerm: currentTerm ? currentTerm.name.toLowerCase() : null,
  }
}

export async function loadResultList(filters: ResultFilters): Promise<ResultList> {
  const where: Prisma.ResultWhereInput = {}

  const sessions = await db.academicSession.findMany({ select: { id: true, name: true } })
  const session = sessions.find((s) => sessionKey(s.name) === filters.session)
  where.sessionId = session?.id ?? "none" // an unknown session key matches nothing

  if (filters.term !== "all") {
    const name = TERM_BY_KEY[filters.term as keyof typeof TERM_BY_KEY]
    where.term = name ? { name } : { id: "none" } // an unknown term key matches nothing
  }
  if (filters.classKey) {
    const classes = await db.schoolClass.findMany({ select: { id: true, name: true, section: true } })
    where.classId = classes.find((c) => classKey(c.name, c.section) === filters.classKey)?.id ?? "none"
  }
  if (filters.subject) where.entries = { some: { subject: { code: filters.subject } } }

  const found = await db.result.findMany({
    where,
    select: {
      status: true,
      publishedAt: true,
      classId: true,
      sessionId: true,
      student: { select: { admissionNumber: true, user: { select: { firstName: true, lastName: true } } } },
      class: { select: { name: true, section: true, level: true } },
      term: { select: { name: true, session: { select: { name: true } } } },
      entries: { select: { status: true } },
    },
  })

  const required = await db.classSubject.groupBy({ by: ["classId", "sessionId"], _count: { _all: true } })
  const requiredFor = (classId: string, sessionId: string) => required.find((r) => r.classId === classId && r.sessionId === sessionId)?._count._all ?? 0

  const counts: Record<ResultStatus, number> = { DRAFT: 0, SUBMITTED: 0, PUBLISHED: 0 }
  for (const r of found) counts[r.status] += 1

  const shown = filters.status === "ALL" ? found : found.filter((r) => r.status === filters.status)
  shown.sort(
    (a, b) =>
      STATUS_ORDER[a.status] - STATUS_ORDER[b.status] ||
      a.class.level - b.class.level ||
      a.student.user.lastName.localeCompare(b.student.user.lastName) ||
      a.student.user.firstName.localeCompare(b.student.user.firstName),
  )

  const pageCount = Math.max(1, Math.ceil(shown.length / PAGE_SIZE))
  const page = Math.min(Math.max(1, filters.page), pageCount)
  const rows: AdminResultRow[] = shown.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE).map((r) => ({
    studentName: `${r.student.user.firstName} ${r.student.user.lastName}`,
    admissionNumber: r.student.admissionNumber,
    className: classLabel(r.class.name, r.class.section),
    termKey: termKey(r.term.session.name, r.term.name),
    termLabel: termLabel(r.term.session.name, r.term.name),
    status: r.status,
    submittedSubjects: r.entries.filter((e) => e.status === "SUBMITTED").length,
    requiredSubjects: requiredFor(r.classId, r.sessionId),
    publishedAt: r.publishedAt,
  }))

  return { rows, total: shown.length, page, pageCount, pageSize: PAGE_SIZE, filters: { ...filters, page }, counts }
}

// ---------------------------------------------------------------------------------------------------------
// One result in full
// ---------------------------------------------------------------------------------------------------------

async function findResult(client: Client, admission: string, key: string) {
  const terms = await client.term.findMany({ select: { id: true, name: true, session: { select: { name: true } } } })
  const term = terms.find((t) => termKey(t.session.name, t.name) === key)
  if (!term) return null
  return client.result.findFirst({
    where: { termId: term.id, student: { admissionNumber: admission } },
    include: {
      student: { select: { admissionNumber: true, user: { select: { firstName: true, lastName: true } } } },
      class: { select: { id: true, name: true, section: true } },
      session: { select: { name: true } },
      term: { select: { name: true } },
      publishedBy: { select: { firstName: true, lastName: true } },
      gradingScheme: {
        include: { components: { orderBy: { sortOrder: "asc" } }, gradeBands: { orderBy: { minScore: "desc" } } },
      },
    },
  })
}

type LoadedResult = NonNullable<Awaited<ReturnType<typeof findResult>>>

/** The completeness verdict for a loaded result. Reads the class's subjects and the result's entries from the database. */
async function assess(client: Pick<typeof db, "classSubject" | "resultEntry">, result: LoadedResult) {
  const scheme: GradingScheme = {
    components: result.gradingScheme.components.map((c) => ({ shortName: c.shortName, name: c.name, maxScore: c.maxScore.toNumber(), weight: c.weight.toNumber() })),
    bands: result.gradingScheme.gradeBands.map((b) => ({ grade: b.grade, minScore: b.minScore.toNumber(), maxScore: b.maxScore.toNumber(), remark: b.remark })),
  }
  const [classSubjects, entries] = await Promise.all([
    client.classSubject.findMany({
      where: { classId: result.classId, sessionId: result.sessionId },
      select: { subject: { select: { id: true, code: true, name: true } } },
    }),
    client.resultEntry.findMany({
      where: { resultId: result.id },
      select: { subjectId: true, status: true, totalScore: true, grade: true, remark: true, scores: { select: { score: true, assessmentComponent: { select: { shortName: true } } } } },
    }),
  ])
  const required: RequiredSubject[] = classSubjects
    .map((c) => ({ subjectId: c.subject.id, code: c.subject.code, name: c.subject.name }))
    .sort((a, b) => a.name.localeCompare(b.name))
  const snapshots: EntrySnapshot[] = entries.map((e) => ({
    subjectId: e.subjectId,
    status: e.status,
    totalScore: e.totalScore?.toNumber() ?? null,
    grade: e.grade,
    remark: e.remark,
    scores: Object.fromEntries(e.scores.map((s) => [s.assessmentComponent.shortName, s.score.toNumber()])),
  }))
  return { scheme, completeness: evaluateResult(scheme, required, snapshots) }
}

export async function loadResultReview(admission: string, key: string): Promise<ResultReview | null> {
  const result = await findResult(db, admission, key)
  if (!result) return null
  const { scheme, completeness } = await assess(db, result)

  const history = await db.resultPublication.findMany({
    where: { resultId: result.id },
    orderBy: { publishedAt: "desc" },
    take: 10,
    select: { action: true, publishedAt: true, publishedBy: { select: { firstName: true, lastName: true } } },
  })
  const totals = completeness.subjects.map((s) => s.total)
  const allTotals = completeness.subjects.length > 0 && totals.every((t): t is number => t !== null)
  const sum = allTotals ? Math.round((totals as number[]).reduce((a, b) => a + b, 0) * 100) / 100 : 0

  return {
    student: { name: `${result.student.user.firstName} ${result.student.user.lastName}`, admissionNumber: result.student.admissionNumber },
    className: classLabel(result.class.name, result.class.section),
    sessionName: result.session.name,
    termName: result.term.name,
    termKey: key,
    status: result.status,
    publishedAt: result.publishedAt,
    publishedBy: result.publishedBy ? `${result.publishedBy.firstName} ${result.publishedBy.lastName}` : null,
    scheme,
    completeness,
    overall: allTotals ? { total: sum, average: Math.round((sum / totals.length) * 100) / 100 } : null,
    history: history.map((h) => ({ action: h.action, at: h.publishedAt, by: `${h.publishedBy.firstName} ${h.publishedBy.lastName}` })),
  }
}

// ---------------------------------------------------------------------------------------------------------
// Publish / unpublish
// ---------------------------------------------------------------------------------------------------------

async function refuseUnauthorized(userId: string, action: string): Promise<PublishOutcome> {
  await recordAdminDenied(userId, "Result", action)
  return { ok: false, code: "NOT_AUTHORIZED", message: "Only an administrator can do this." }
}

export async function publishResult(actor: AdminActor, request: { admission: string; termKey: string }): Promise<PublishOutcome> {
  if (!(await isActiveAdmin(actor.userId))) return refuseUnauthorized(actor.userId, "publish")

  const outcome = await db.$transaction(
    async (tx): Promise<PublishOutcome> => {
      const result = await findResult(tx, request.admission, request.termKey)
      if (!result) return { ok: false, code: "NOT_FOUND", message: "That result could not be found." }
      if (result.status === "PUBLISHED") return { ok: false, code: "ALREADY", message: "This result is already published." }

      const { completeness } = await assess(tx, result)
      if (!completeness.complete) {
        return {
          ok: false,
          code: "INCOMPLETE",
          message: "This result cannot be published yet because it is incomplete.",
          issues: completeness.issues,
        }
      }
      if (result.status !== "SUBMITTED") {
        return { ok: false, code: "NOT_READY", message: "Only a result that every teacher has submitted can be published." }
      }

      const now = new Date()
      const updated = await tx.result.updateMany({
        where: { id: result.id, status: "SUBMITTED" },
        data: { status: "PUBLISHED", publishedAt: now, publishedById: actor.userId },
      })
      if (updated.count !== 1) return { ok: false, code: "CHANGED", message: "This result was changed by someone else. Reload and try again." }

      await tx.resultPublication.create({ data: { resultId: result.id, publishedById: actor.userId, publishedAt: now, action: "PUBLISHED" } })
      await tx.auditLog.create({
        data: {
          userId: actor.userId,
          action: "RESULT_PUBLISHED",
          entityType: "Result",
          entityId: result.id,
          metadata: {
            admissionNumber: result.student.admissionNumber,
            class: classLabel(result.class.name, result.class.section),
            term: result.term.name,
            session: result.session.name,
            subjects: completeness.subjects.length,
          },
        },
      })
      return { ok: true, message: `Result published. ${result.student.user.firstName} ${result.student.user.lastName} can now view it in the student portal.` }
    },
    { timeout: 20_000 },
  )

  if (!outcome.ok && outcome.code === "INCOMPLETE") {
    // Recorded outside the (rolled back) transaction: a blocked attempt is worth seeing in the audit log.
    await db.auditLog.create({
      data: { userId: actor.userId, action: "RESULT_PUBLISH_BLOCKED", entityType: "Result", metadata: { admissionNumber: request.admission, termKey: request.termKey, problems: outcome.issues?.length ?? 0 } },
    })
  }
  return outcome
}

export async function unpublishResult(actor: AdminActor, request: { admission: string; termKey: string; reason: string }): Promise<PublishOutcome> {
  if (!(await isActiveAdmin(actor.userId))) return refuseUnauthorized(actor.userId, "unpublish")

  const reason = request.reason.trim()
  if (reason.length < 3 || reason.length > 300) return { ok: false, code: "INVALID", message: "Give a short reason (3 to 300 characters)." }

  return db.$transaction(
    async (tx): Promise<PublishOutcome> => {
      const result = await findResult(tx, request.admission, request.termKey)
      if (!result) return { ok: false, code: "NOT_FOUND", message: "That result could not be found." }
      if (result.status !== "PUBLISHED") return { ok: false, code: "NOT_READY", message: "Only a published result can be unpublished." }

      const updated = await tx.result.updateMany({
        where: { id: result.id, status: "PUBLISHED" },
        data: { status: "SUBMITTED", publishedAt: null, publishedById: null },
      })
      if (updated.count !== 1) return { ok: false, code: "CHANGED", message: "This result was changed by someone else. Reload and try again." }

      await tx.resultPublication.create({ data: { resultId: result.id, publishedById: actor.userId, action: "UNPUBLISHED" } })
      await tx.auditLog.create({
        data: {
          userId: actor.userId,
          action: "RESULT_UNPUBLISHED",
          entityType: "Result",
          entityId: result.id,
          metadata: {
            admissionNumber: result.student.admissionNumber,
            class: classLabel(result.class.name, result.class.section),
            term: result.term.name,
            session: result.session.name,
            reason,
          },
        },
      })
      return { ok: true, message: "Result unpublished. The student can no longer see it; the scores are kept." }
    },
    { timeout: 20_000 },
  )
}

// ---------------------------------------------------------------------------------------------------------
// Return for correction
// ---------------------------------------------------------------------------------------------------------

/**
 * Sends ONE subject of a submitted (not yet published) result back to its teacher for correction: that subject's entry goes
 * back to DRAFT and the result goes back to DRAFT, so the teacher can edit and submit again. Scores are kept. Nothing about a
 * published result can be changed this way (unpublish it first), and the reason is recorded in the audit log.
 */
export async function returnForCorrection(
  actor: AdminActor,
  request: { admission: string; termKey: string; subjectCode: string; reason: string },
): Promise<PublishOutcome> {
  if (!(await isActiveAdmin(actor.userId))) return refuseUnauthorized(actor.userId, "return-for-correction")

  const reason = request.reason.trim()
  if (reason.length < 3 || reason.length > 300) return { ok: false, code: "INVALID", message: "Give a short reason (3 to 300 characters)." }

  return db.$transaction(
    async (tx): Promise<PublishOutcome> => {
      const result = await findResult(tx, request.admission, request.termKey)
      if (!result) return { ok: false, code: "NOT_FOUND", message: "That result could not be found." }
      if (result.status === "PUBLISHED") return { ok: false, code: "NOT_READY", message: "This result is published. Unpublish it first if it needs correcting." }

      const entry = await tx.resultEntry.findFirst({
        where: { resultId: result.id, subject: { code: request.subjectCode } },
        select: { id: true, status: true, subject: { select: { code: true, name: true } } },
      })
      if (!entry) return { ok: false, code: "NOT_FOUND", message: "That subject has no entry for this result." }
      if (entry.status !== "SUBMITTED") return { ok: false, code: "NOT_READY", message: "Only a submitted subject can be returned. This one is still a draft." }

      const entryUpdated = await tx.resultEntry.updateMany({ where: { id: entry.id, status: "SUBMITTED" }, data: { status: "DRAFT" } })
      const resultUpdated = await tx.result.updateMany({ where: { id: result.id, status: { not: "PUBLISHED" } }, data: { status: "DRAFT" } })
      if (entryUpdated.count !== 1 || resultUpdated.count !== 1) return { ok: false, code: "CHANGED", message: "This result was changed by someone else. Reload and try again." }

      await tx.auditLog.create({
        data: {
          userId: actor.userId,
          action: "RESULT_RETURNED_FOR_CORRECTION",
          entityType: "ResultEntry",
          entityId: entry.id,
          metadata: {
            admissionNumber: result.student.admissionNumber,
            class: classLabel(result.class.name, result.class.section),
            subject: entry.subject.code,
            term: result.term.name,
            session: result.session.name,
            reason,
          },
        },
      })
      return { ok: true, message: `${entry.subject.name} was returned to its teacher for correction. The scores are kept and the teacher can edit and submit again.` }
    },
    { timeout: 20_000 },
  )
}
