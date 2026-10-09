import "server-only"

import { db } from "@/lib/db"
import { adminGate, isConstraintViolation } from "@/lib/services/admin-guard"
import type { AdminActor } from "@/lib/services/admin-results"
import type { Outcome } from "@/types/manage"

/**
 * Grading configuration (internal; reached only through admin-manage-actions after an ADMIN session check; every write
 * re-confirms the actor is an active admin). Nothing about CA / exam / grades is hard-coded: components and grade bands are
 * rows in the database.
 *
 * Protecting history: every Result records the scheme it was created with. A scheme that any result uses is LOCKED: its
 * components and bands cannot be edited or deleted, so a published result never silently changes meaning. To change the
 * rules, copy the scheme (which copies its components and bands), edit the copy, and make the copy the default: new results
 * use it and old results keep the scheme they were created with.
 *
 * The database also enforces component maximum > 0, weight in (0, 100], band min <= max, and non-overlapping bands.
 */

const fail = (message: string, fieldErrors?: Record<string, string>): Outcome => ({ ok: false, message, fieldErrors })
const r2 = (n: number) => Math.round(n * 100) / 100

export type SchemeView = {
  name: string
  description: string | null
  isDefault: boolean
  usedByResults: number
  locked: boolean
  weightTotal: number
  /** Why this scheme cannot be made the default yet, or null when it can. */
  notReady: string | null
  components: { name: string; shortName: string; maxScore: number; weight: number; sortOrder: number }[]
  bands: { grade: string; minScore: number; maxScore: number; remark: string; sortOrder: number }[]
}

export async function loadGrading(): Promise<SchemeView[]> {
  const schemes = await db.gradingScheme.findMany({
    orderBy: [{ isDefault: "desc" }, { name: "asc" }],
    select: {
      name: true, description: true, isDefault: true,
      _count: { select: { results: true } },
      components: { orderBy: [{ sortOrder: "asc" }, { name: "asc" }], select: { name: true, shortName: true, maxScore: true, weight: true, sortOrder: true } },
      gradeBands: { orderBy: [{ minScore: "desc" }], select: { grade: true, minScore: true, maxScore: true, remark: true, sortOrder: true } },
    },
  })
  return schemes.map((s) => {
    const components = s.components.map((c) => ({ ...c, maxScore: Number(c.maxScore), weight: Number(c.weight) }))
    const bands = s.gradeBands.map((b) => ({ ...b, minScore: Number(b.minScore), maxScore: Number(b.maxScore) }))
    const weightTotal = r2(components.reduce((t, c) => t + c.weight, 0))
    const notReady =
      components.length === 0 ? "Add at least one assessment component."
      : weightTotal !== 100 ? `The component weights add up to ${weightTotal}, not 100.`
      : bands.length === 0 ? "Add the grade bands."
      : null
    return { name: s.name, description: s.description, isDefault: s.isDefault, usedByResults: s._count.results, locked: s._count.results > 0, weightTotal, notReady, components, bands }
  })
}

async function schemeFor(name: string) {
  const scheme = await db.gradingScheme.findUnique({ where: { name }, select: { id: true, name: true, isDefault: true, _count: { select: { results: true } } } })
  return scheme ? { ...scheme, used: scheme._count.results } : null
}

const lockedMessage = (used: number) =>
  `This scheme is used by ${used} ${used === 1 ? "result" : "results"}, so it is locked. Copy it to a new scheme, edit the copy and make that the default.`

export async function createScheme(actor: AdminActor, input: { name: string; description: string; copyFrom: string }): Promise<Outcome> {
  const denied = await adminGate(actor.userId, "GradingScheme", "create")
  if (denied) return denied
  if (await db.gradingScheme.findUnique({ where: { name: input.name }, select: { id: true } })) return fail("Please correct the form.", { name: "A scheme with this name already exists." })
  const source = input.copyFrom
    ? await db.gradingScheme.findUnique({ where: { name: input.copyFrom }, include: { components: true, gradeBands: true } })
    : null
  if (input.copyFrom && !source) return fail("Please correct the form.", { copyFrom: "Choose one of the listed schemes." })

  try {
    await db.$transaction(async (tx) => {
      const created = await tx.gradingScheme.create({ data: { name: input.name, description: input.description || null, isDefault: false }, select: { id: true } })
      if (source) {
        await tx.assessmentComponent.createMany({
          data: source.components.map((c) => ({ gradingSchemeId: created.id, name: c.name, shortName: c.shortName, maxScore: c.maxScore, weight: c.weight, sortOrder: c.sortOrder })),
        })
        await tx.gradeBand.createMany({
          data: source.gradeBands.map((b) => ({ gradingSchemeId: created.id, grade: b.grade, minScore: b.minScore, maxScore: b.maxScore, remark: b.remark, sortOrder: b.sortOrder })),
        })
      }
      await tx.auditLog.create({ data: { userId: actor.userId, action: "GRADING_SCHEME_CREATED", entityType: "GradingScheme", entityId: created.id, metadata: { name: input.name, copiedFrom: input.copyFrom || null } } })
    })
  } catch (e) {
    if (isConstraintViolation(e)) return fail("Please correct the form.", { name: "A scheme with this name already exists." })
    throw e
  }
  return { ok: true, message: `Scheme "${input.name}" was created${source ? ` as a copy of "${source.name}"` : ""}.` }
}

export async function setDefaultScheme(actor: AdminActor, name: string): Promise<Outcome> {
  const denied = await adminGate(actor.userId, "GradingScheme", "set-default")
  if (denied) return denied
  const view = (await loadGrading()).find((s) => s.name === name)
  if (!view) return fail("That scheme no longer exists.")
  if (view.isDefault) return fail(`"${name}" is already the default scheme.`)
  if (view.notReady) return fail(`"${name}" cannot be the default yet. ${view.notReady}`)
  const scheme = await schemeFor(name)
  if (!scheme) return fail("That scheme no longer exists.")
  try {
    await db.$transaction([
      db.gradingScheme.updateMany({ where: { isDefault: true }, data: { isDefault: false } }),
      db.gradingScheme.update({ where: { id: scheme.id }, data: { isDefault: true } }),
      db.auditLog.create({ data: { userId: actor.userId, action: "GRADING_SCHEME_SET_DEFAULT", entityType: "GradingScheme", entityId: scheme.id, metadata: { name } } }),
    ])
  } catch (e) {
    if (isConstraintViolation(e)) return fail("Someone else changed the default scheme at the same time. Please try again.")
    throw e
  }
  return { ok: true, message: `"${name}" is now the default scheme. Results already created keep the scheme they were created with.` }
}

// ---------------------------------------------------------------------------------------------------
// Components
// ---------------------------------------------------------------------------------------------------

type ComponentInput = { scheme: string; name: string; shortName: string; maxScore: number; weight: number; sortOrder: number }

async function checkComponent(input: ComponentInput, ignoreShortName?: string): Promise<Outcome | { ok: true; schemeId: string; id?: string }> {
  const scheme = await schemeFor(input.scheme)
  if (!scheme) return fail("That scheme no longer exists.")
  if (scheme.used > 0) return fail(lockedMessage(scheme.used))
  const others = await db.assessmentComponent.findMany({ where: { gradingSchemeId: scheme.id }, select: { id: true, name: true, shortName: true, weight: true } })
  const rest = others.filter((c) => c.shortName !== ignoreShortName)
  const errors: Record<string, string> = {}
  if (rest.some((c) => c.shortName.toLowerCase() === input.shortName.toLowerCase())) errors.shortName = "Another component already uses this short name."
  if (rest.some((c) => c.name.toLowerCase() === input.name.toLowerCase())) errors.name = "Another component already uses this name."
  const total = r2(rest.reduce((t, c) => t + Number(c.weight), 0) + input.weight)
  if (total > 100) errors.weight = `The weights would add up to ${total}. They cannot be more than 100 (the other components already use ${r2(total - input.weight)}).`
  if (Object.keys(errors).length) return fail("Please correct the form.", errors)
  return { ok: true, schemeId: scheme.id, id: others.find((c) => c.shortName === ignoreShortName)?.id }
}

export async function addComponent(actor: AdminActor, input: ComponentInput): Promise<Outcome> {
  const denied = await adminGate(actor.userId, "AssessmentComponent", "create")
  if (denied) return denied
  const check = await checkComponent(input)
  if (!("schemeId" in check)) return check
  try {
    const created = await db.assessmentComponent.create({
      data: { gradingSchemeId: check.schemeId, name: input.name, shortName: input.shortName, maxScore: input.maxScore, weight: input.weight, sortOrder: input.sortOrder },
      select: { id: true },
    })
    await db.auditLog.create({ data: { userId: actor.userId, action: "COMPONENT_ADDED", entityType: "AssessmentComponent", entityId: created.id, metadata: { scheme: input.scheme, component: input.shortName, max: input.maxScore, weight: input.weight } } })
  } catch (e) {
    if (isConstraintViolation(e)) return fail("Please correct the form.", { shortName: "That short name or name is already used in this scheme." })
    throw e
  }
  return { ok: true, message: `Component "${input.name}" was added.` }
}

export async function updateComponent(actor: AdminActor, input: ComponentInput & { current: string }): Promise<Outcome> {
  const denied = await adminGate(actor.userId, "AssessmentComponent", "update")
  if (denied) return denied
  const check = await checkComponent(input, input.current)
  if (!("schemeId" in check)) return check
  if (!check.id) return fail("That component no longer exists.")
  try {
    await db.$transaction([
      db.assessmentComponent.update({ where: { id: check.id }, data: { name: input.name, shortName: input.shortName, maxScore: input.maxScore, weight: input.weight, sortOrder: input.sortOrder } }),
      db.auditLog.create({ data: { userId: actor.userId, action: "COMPONENT_UPDATED", entityType: "AssessmentComponent", entityId: check.id, metadata: { scheme: input.scheme, component: input.shortName, max: input.maxScore, weight: input.weight } } }),
    ])
  } catch (e) {
    if (isConstraintViolation(e)) return fail("Please correct the form.", { shortName: "That short name or name is already used in this scheme." })
    throw e
  }
  return { ok: true, message: `Component "${input.name}" was saved.` }
}

export async function deleteComponent(actor: AdminActor, input: { scheme: string; shortName: string }): Promise<Outcome> {
  const denied = await adminGate(actor.userId, "AssessmentComponent", "delete")
  if (denied) return denied
  const scheme = await schemeFor(input.scheme)
  if (!scheme) return fail("That scheme no longer exists.")
  if (scheme.used > 0) return fail(lockedMessage(scheme.used))
  const component = await db.assessmentComponent.findUnique({ where: { gradingSchemeId_shortName: { gradingSchemeId: scheme.id, shortName: input.shortName } }, select: { id: true } })
  if (!component) return fail("That component no longer exists.")
  if (scheme.isDefault) {
    const remaining = await db.assessmentComponent.count({ where: { gradingSchemeId: scheme.id, id: { not: component.id } } })
    if (remaining === 0) return fail("The default scheme must keep at least one component.")
  }
  await db.$transaction([
    db.assessmentComponent.delete({ where: { id: component.id } }),
    db.auditLog.create({ data: { userId: actor.userId, action: "COMPONENT_DELETED", entityType: "AssessmentComponent", entityId: component.id, metadata: { scheme: input.scheme, component: input.shortName } } }),
  ])
  return { ok: true, message: "Component removed." }
}

// ---------------------------------------------------------------------------------------------------
// Grade bands
// ---------------------------------------------------------------------------------------------------

type BandInput = { scheme: string; grade: string; minScore: number; maxScore: number; remark: string; sortOrder: number }

async function checkBand(input: BandInput, ignoreGrade?: string): Promise<Outcome | { ok: true; schemeId: string; id?: string }> {
  const scheme = await schemeFor(input.scheme)
  if (!scheme) return fail("That scheme no longer exists.")
  if (scheme.used > 0) return fail(lockedMessage(scheme.used))
  const errors: Record<string, string> = {}
  if (input.minScore > input.maxScore) errors.maxScore = "The highest score must not be lower than the lowest score."
  const others = await db.gradeBand.findMany({ where: { gradingSchemeId: scheme.id }, select: { id: true, grade: true, minScore: true, maxScore: true } })
  const rest = others.filter((b) => b.grade !== ignoreGrade)
  if (rest.some((b) => b.grade.toLowerCase() === input.grade.toLowerCase())) errors.grade = "Another band already uses this grade."
  const clash = rest.find((b) => input.minScore <= Number(b.maxScore) && Number(b.minScore) <= input.maxScore)
  if (clash && !errors.maxScore) errors.minScore = `These scores overlap grade ${clash.grade} (${Number(clash.minScore)} to ${Number(clash.maxScore)}).`
  if (Object.keys(errors).length) return fail("Please correct the form.", errors)
  return { ok: true, schemeId: scheme.id, id: others.find((b) => b.grade === ignoreGrade)?.id }
}

export async function addBand(actor: AdminActor, input: BandInput): Promise<Outcome> {
  const denied = await adminGate(actor.userId, "GradeBand", "create")
  if (denied) return denied
  const check = await checkBand(input)
  if (!("schemeId" in check)) return check
  try {
    const created = await db.gradeBand.create({
      data: { gradingSchemeId: check.schemeId, grade: input.grade, minScore: input.minScore, maxScore: input.maxScore, remark: input.remark, sortOrder: input.sortOrder },
      select: { id: true },
    })
    await db.auditLog.create({ data: { userId: actor.userId, action: "GRADE_BAND_ADDED", entityType: "GradeBand", entityId: created.id, metadata: { scheme: input.scheme, grade: input.grade, min: input.minScore, max: input.maxScore } } })
  } catch (e) {
    if (isConstraintViolation(e)) return fail("Please correct the form.", { minScore: "These scores overlap another grade band." })
    throw e
  }
  return { ok: true, message: `Grade ${input.grade} was added.` }
}

export async function updateBand(actor: AdminActor, input: BandInput & { current: string }): Promise<Outcome> {
  const denied = await adminGate(actor.userId, "GradeBand", "update")
  if (denied) return denied
  const check = await checkBand(input, input.current)
  if (!("schemeId" in check)) return check
  if (!check.id) return fail("That grade band no longer exists.")
  try {
    await db.$transaction([
      db.gradeBand.update({ where: { id: check.id }, data: { grade: input.grade, minScore: input.minScore, maxScore: input.maxScore, remark: input.remark, sortOrder: input.sortOrder } }),
      db.auditLog.create({ data: { userId: actor.userId, action: "GRADE_BAND_UPDATED", entityType: "GradeBand", entityId: check.id, metadata: { scheme: input.scheme, grade: input.grade, min: input.minScore, max: input.maxScore } } }),
    ])
  } catch (e) {
    if (isConstraintViolation(e)) return fail("Please correct the form.", { minScore: "These scores overlap another grade band." })
    throw e
  }
  return { ok: true, message: `Grade ${input.grade} was saved.` }
}

export async function deleteBand(actor: AdminActor, input: { scheme: string; grade: string }): Promise<Outcome> {
  const denied = await adminGate(actor.userId, "GradeBand", "delete")
  if (denied) return denied
  const scheme = await schemeFor(input.scheme)
  if (!scheme) return fail("That scheme no longer exists.")
  if (scheme.used > 0) return fail(lockedMessage(scheme.used))
  const band = await db.gradeBand.findUnique({ where: { gradingSchemeId_grade: { gradingSchemeId: scheme.id, grade: input.grade } }, select: { id: true } })
  if (!band) return fail("That grade band no longer exists.")
  await db.$transaction([
    db.gradeBand.delete({ where: { id: band.id } }),
    db.auditLog.create({ data: { userId: actor.userId, action: "GRADE_BAND_DELETED", entityType: "GradeBand", entityId: band.id, metadata: { scheme: input.scheme, grade: input.grade } } }),
  ])
  return { ok: true, message: `Grade ${input.grade} was removed.` }
}
