import "server-only"

import { sessionKey as toSessionKey, TERM_LABEL } from "@/lib/academic"
import { db } from "@/lib/db"
import { adminGate, isConstraintViolation } from "@/lib/services/admin-guard"
import type { AdminActor } from "@/lib/services/admin-results"
import type { TermName } from "@/generated/prisma/enums"
import type { Outcome } from "@/types/manage"

/**
 * Academic sessions and terms (internal; reached only through admin-manage-actions.ts after an ADMIN session check; every
 * write re-confirms the actor is an active admin).
 *
 * Rules enforced here AND by the database: one current session, one current term (partial unique indexes), start before
 * end (CHECK). On top of those: sessions must not overlap each other, terms must sit inside their session and not overlap
 * each other, and the current term must belong to the current session. Nothing is ever deleted: a session that stops being
 * current keeps its terms, enrolments, assignments and results.
 */

const fail = (message: string, fieldErrors?: Record<string, string>): Outcome => ({ ok: false, message, fieldErrors })
const day = (v: string) => new Date(`${v}T00:00:00.000Z`)
const iso = (d: Date) => d.toISOString().slice(0, 10)
const overlaps = (a: { start: Date; end: Date }, b: { start: Date; end: Date }) => a.start <= b.end && b.start <= a.end

export type SessionView = {
  key: string
  name: string
  startDate: Date
  endDate: Date
  isCurrent: boolean
  counts: { students: number; assignments: number; results: number }
  terms: { name: TermName; label: string; startDate: Date; endDate: Date; isCurrent: boolean }[]
}

export async function loadSessions(): Promise<SessionView[]> {
  const sessions = await db.academicSession.findMany({
    orderBy: { startDate: "desc" },
    select: {
      name: true, startDate: true, endDate: true, isCurrent: true,
      terms: { orderBy: { startDate: "asc" }, select: { name: true, startDate: true, endDate: true, isCurrent: true } },
      _count: { select: { enrollments: true, teacherAssignments: true, results: true } },
    },
  })
  return sessions.map((s) => ({
    key: toSessionKey(s.name), name: s.name, startDate: s.startDate, endDate: s.endDate, isCurrent: s.isCurrent,
    counts: { students: s._count.enrollments, assignments: s._count.teacherAssignments, results: s._count.results },
    terms: s.terms.map((t) => ({ ...t, label: TERM_LABEL[t.name] })),
  }))
}

async function bySessionKey(key: string) {
  const sessions = await db.academicSession.findMany({ select: { id: true, name: true, startDate: true, endDate: true, isCurrent: true } })
  return sessions.find((s) => toSessionKey(s.name) === key) ?? null
}

/** Picks the term to mark current when a session becomes current: the one running today, else the earliest. */
function pickCurrentTerm(terms: { id: string; startDate: Date; endDate: Date }[], today: Date) {
  const running = terms.find((t) => t.startDate <= today && today <= t.endDate)
  return running ?? [...terms].sort((a, b) => a.startDate.getTime() - b.startDate.getTime())[0] ?? null
}

export type NewSession = {
  name: string; startDate: string; endDate: string; makeCurrent: boolean
  firstStart: string; firstEnd: string; secondStart: string; secondEnd: string; thirdStart: string; thirdEnd: string
}

export async function createSession(actor: AdminActor, input: NewSession, today = new Date()): Promise<Outcome> {
  const denied = await adminGate(actor.userId, "AcademicSession", "create")
  if (denied) return denied

  const [a, b] = input.name.split("/").map(Number)
  if (b !== a + 1) return fail("Please correct the form.", { name: "The second year must follow the first (for example 2026/2027)." })
  const range = { start: day(input.startDate), end: day(input.endDate) }
  if (range.start >= range.end) return fail("Please correct the form.", { endDate: "The session must end after it starts." })

  const terms: { name: TermName; start: Date; end: Date; field: string }[] = [
    { name: "FIRST", start: day(input.firstStart), end: day(input.firstEnd), field: "first" },
    { name: "SECOND", start: day(input.secondStart), end: day(input.secondEnd), field: "second" },
    { name: "THIRD", start: day(input.thirdStart), end: day(input.thirdEnd), field: "third" },
  ]
  const errors: Record<string, string> = {}
  for (const t of terms) {
    if (t.start >= t.end) errors[`${t.field}End`] = "The term must end after it starts."
    else if (t.start < range.start || t.end > range.end) errors[`${t.field}Start`] = "The term must fall inside the session dates."
  }
  for (let i = 0; i < terms.length; i++) {
    for (let j = i + 1; j < terms.length; j++) {
      if (overlaps(terms[i], terms[j])) errors[`${terms[j].field}Start`] ??= `${TERM_LABEL[terms[j].name]} overlaps ${TERM_LABEL[terms[i].name]}.`
    }
  }
  if (Object.keys(errors).length) return fail("Please correct the dates.", errors)

  if (await db.academicSession.findUnique({ where: { name: input.name }, select: { id: true } })) {
    return fail("Please correct the form.", { name: "That session already exists." })
  }
  for (const other of await db.academicSession.findMany({ select: { name: true, startDate: true, endDate: true } })) {
    if (overlaps(range, { start: other.startDate, end: other.endDate })) {
      return fail("Please correct the form.", { startDate: `These dates overlap the ${other.name} session.` })
    }
  }

  try {
    await db.$transaction(async (tx) => {
      if (input.makeCurrent) {
        await tx.term.updateMany({ where: { isCurrent: true }, data: { isCurrent: false } })
        await tx.academicSession.updateMany({ where: { isCurrent: true }, data: { isCurrent: false } })
      }
      const session = await tx.academicSession.create({
        data: { name: input.name, startDate: range.start, endDate: range.end, isCurrent: input.makeCurrent },
        select: { id: true },
      })
      const created = []
      for (const t of terms) {
        created.push(await tx.term.create({ data: { sessionId: session.id, name: t.name, startDate: t.start, endDate: t.end }, select: { id: true, startDate: true, endDate: true } }))
      }
      if (input.makeCurrent) {
        const current = pickCurrentTerm(created, today)
        if (current) await tx.term.update({ where: { id: current.id }, data: { isCurrent: true } })
      }
      await tx.auditLog.create({
        data: { userId: actor.userId, action: "SESSION_CREATED", entityType: "AcademicSession", entityId: session.id, metadata: { name: input.name, current: input.makeCurrent, start: input.startDate, end: input.endDate } },
      })
    })
  } catch (e) {
    if (isConstraintViolation(e)) return fail("Someone else changed the sessions at the same time. Please try again.")
    throw e
  }
  return { ok: true, message: `Session ${input.name} was created${input.makeCurrent ? " and set as the current session" : ""}.` }
}

export async function updateSession(actor: AdminActor, input: { sessionKey: string; startDate: string; endDate: string }): Promise<Outcome> {
  const denied = await adminGate(actor.userId, "AcademicSession", "update")
  if (denied) return denied
  const session = await bySessionKey(input.sessionKey)
  if (!session) return fail("That session no longer exists.")
  const range = { start: day(input.startDate), end: day(input.endDate) }
  if (range.start >= range.end) return fail("Please correct the form.", { endDate: "The session must end after it starts." })

  for (const other of await db.academicSession.findMany({ where: { id: { not: session.id } }, select: { name: true, startDate: true, endDate: true } })) {
    if (overlaps(range, { start: other.startDate, end: other.endDate })) return fail("Please correct the form.", { startDate: `These dates overlap the ${other.name} session.` })
  }
  const terms = await db.term.findMany({ where: { sessionId: session.id }, select: { name: true, startDate: true, endDate: true } })
  const outside = terms.find((t) => t.startDate < range.start || t.endDate > range.end)
  if (outside) return fail("Please correct the form.", { startDate: `${TERM_LABEL[outside.name]} (${iso(outside.startDate)} to ${iso(outside.endDate)}) would fall outside these dates. Change the term first.` })

  await db.$transaction([
    db.academicSession.update({ where: { id: session.id }, data: { startDate: range.start, endDate: range.end } }),
    db.auditLog.create({ data: { userId: actor.userId, action: "SESSION_UPDATED", entityType: "AcademicSession", entityId: session.id, metadata: { name: session.name, start: input.startDate, end: input.endDate } } }),
  ])
  return { ok: true, message: `Session ${session.name} was updated.` }
}

/** Creates or changes one term of a session. */
export async function saveTerm(actor: AdminActor, input: { sessionKey: string; term: TermName; startDate: string; endDate: string }): Promise<Outcome> {
  const denied = await adminGate(actor.userId, "Term", "save")
  if (denied) return denied
  const session = await bySessionKey(input.sessionKey)
  if (!session) return fail("That session no longer exists.")
  const range = { start: day(input.startDate), end: day(input.endDate) }
  if (range.start >= range.end) return fail("Please correct the form.", { endDate: "The term must end after it starts." })
  if (range.start < session.startDate || range.end > session.endDate) {
    return fail("Please correct the form.", { startDate: `The term must fall inside the session (${iso(session.startDate)} to ${iso(session.endDate)}).` })
  }
  for (const sibling of await db.term.findMany({ where: { sessionId: session.id, name: { not: input.term } }, select: { name: true, startDate: true, endDate: true } })) {
    if (overlaps(range, { start: sibling.startDate, end: sibling.endDate })) return fail("Please correct the form.", { startDate: `These dates overlap the ${TERM_LABEL[sibling.name]}.` })
  }
  const existing = await db.term.findUnique({ where: { sessionId_name: { sessionId: session.id, name: input.term } }, select: { id: true } })
  await db.$transaction([
    existing
      ? db.term.update({ where: { id: existing.id }, data: { startDate: range.start, endDate: range.end } })
      : db.term.create({ data: { sessionId: session.id, name: input.term, startDate: range.start, endDate: range.end } }),
    db.auditLog.create({ data: { userId: actor.userId, action: existing ? "TERM_UPDATED" : "TERM_CREATED", entityType: "Term", entityId: session.id, metadata: { session: session.name, term: input.term, start: input.startDate, end: input.endDate } } }),
  ])
  return { ok: true, message: `${TERM_LABEL[input.term]} of ${session.name} was saved.` }
}

/** Makes a session current. The previous current session and term stay in the database, just not current. */
export async function setCurrentSession(actor: AdminActor, sessionKeyValue: string, today = new Date()): Promise<Outcome> {
  const denied = await adminGate(actor.userId, "AcademicSession", "set-current")
  if (denied) return denied
  const session = await bySessionKey(sessionKeyValue)
  if (!session) return fail("That session no longer exists.")
  if (session.isCurrent) return fail(`${session.name} is already the current session.`)

  const terms = await db.term.findMany({ where: { sessionId: session.id }, select: { id: true, startDate: true, endDate: true } })
  try {
    await db.$transaction(async (tx) => {
      await tx.term.updateMany({ where: { isCurrent: true }, data: { isCurrent: false } })
      await tx.academicSession.updateMany({ where: { isCurrent: true }, data: { isCurrent: false } })
      await tx.academicSession.update({ where: { id: session.id }, data: { isCurrent: true } })
      const term = pickCurrentTerm(terms, today)
      if (term) await tx.term.update({ where: { id: term.id }, data: { isCurrent: true } })
      await tx.auditLog.create({ data: { userId: actor.userId, action: "SESSION_SET_CURRENT", entityType: "AcademicSession", entityId: session.id, metadata: { name: session.name } } })
    })
  } catch (e) {
    if (isConstraintViolation(e)) return fail("Someone else changed the sessions at the same time. Please try again.")
    throw e
  }
  return { ok: true, message: `${session.name} is now the current session.` }
}

/** Makes one term of the CURRENT session the current term. */
export async function setCurrentTerm(actor: AdminActor, input: { sessionKey: string; term: TermName }): Promise<Outcome> {
  const denied = await adminGate(actor.userId, "Term", "set-current")
  if (denied) return denied
  const session = await bySessionKey(input.sessionKey)
  if (!session) return fail("That session no longer exists.")
  if (!session.isCurrent) return fail(`Make ${session.name} the current session first. The current term must belong to the current session.`)
  const term = await db.term.findUnique({ where: { sessionId_name: { sessionId: session.id, name: input.term } }, select: { id: true, isCurrent: true } })
  if (!term) return fail(`${TERM_LABEL[input.term]} has not been created for ${session.name} yet.`)
  if (term.isCurrent) return fail(`${TERM_LABEL[input.term]} is already the current term.`)
  try {
    await db.$transaction([
      db.term.updateMany({ where: { isCurrent: true }, data: { isCurrent: false } }),
      db.term.update({ where: { id: term.id }, data: { isCurrent: true } }),
      db.auditLog.create({ data: { userId: actor.userId, action: "TERM_SET_CURRENT", entityType: "Term", entityId: term.id, metadata: { session: session.name, term: input.term } } }),
    ])
  } catch (e) {
    if (isConstraintViolation(e)) return fail("Someone else changed the terms at the same time. Please try again.")
    throw e
  }
  return { ok: true, message: `${TERM_LABEL[input.term]} is now the current term.` }
}
