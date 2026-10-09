import { afterAll, beforeEach, describe, expect, it } from "vitest"

import { db } from "@/lib/db"
import { publishResult, returnForCorrection } from "@/lib/services/admin-results"
import { saveSubjectResults } from "@/lib/services/teacher-results"
import { loadWorkspace, loadPeriod } from "@/lib/services/teacher-workspace"
import { parseSaveForm } from "@/lib/validation/teacher"
import { resetDatabase } from "@/test/helpers"
import { world } from "@/test/world"

beforeEach(resetDatabase)
afterAll(() => db.$disconnect())

const cells = (admission: string, ca: string, exam: string) => ({ [admission]: { CA: ca, Exam: exam } })

async function secondTerm(w: Awaited<ReturnType<typeof world>>) {
  return db.term.create({ data: { name: "SECOND", sessionId: w.session.id, startDate: new Date("2027-01-11"), endDate: new Date("2027-04-02"), isCurrent: false } })
}

describe("choosing a term", () => {
  it("defaults to the current term and offers every term of the current session", async () => {
    const w = await world()
    await secondTerm(w)
    const ws = await loadWorkspace(w.maths.actor, {})
    expect(ws).toMatchObject({ kind: "READY", termName: "FIRST", termKey: "first" })
    if (ws.kind === "READY") expect(ws.terms.map((t) => [t.key, t.current])).toEqual([["first", true], ["second", false]])
  })

  it("saves into the chosen term and keeps terms separate", async () => {
    const w = await world()
    const second = await secondTerm(w)
    const base = { classKey: "jss-1", subjectCode: "MTH", intent: "draft" as const }
    expect(await saveSubjectResults(w.maths.actor, { ...base, term: "second", cells: cells("ZBHS/T/001", "30", "50") })).toMatchObject({ ok: true })
    expect(await saveSubjectResults(w.maths.actor, { ...base, cells: cells("ZBHS/T/001", "10", "20") })).toMatchObject({ ok: true })

    const results = await db.result.findMany({ where: { studentId: w.daniel.id }, orderBy: { createdAt: "asc" } })
    expect(results.map((r) => r.termId).sort()).toEqual([second.id, w.term.id].sort())
    const secondWs = await loadWorkspace(w.maths.actor, { term: "second" })
    const firstWs = await loadWorkspace(w.maths.actor, {})
    if (secondWs.kind !== "READY" || firstWs.kind !== "READY") throw new Error("expected READY")
    expect(secondWs.rows.find((r) => r.admissionNumber === "ZBHS/T/001")?.scores).toEqual({ CA: 30, Exam: 50 })
    expect(firstWs.rows.find((r) => r.admissionNumber === "ZBHS/T/001")?.scores).toEqual({ CA: 10, Exam: 20 })
  })

  it("refuses an unknown term, and a term that has not been set up, without saving anything", async () => {
    const w = await world()
    const base = { classKey: "jss-1", subjectCode: "MTH", intent: "draft" as const, cells: cells("ZBHS/T/001", "30", "50") }
    expect(await saveSubjectResults(w.maths.actor, { ...base, term: "fourth" })).toMatchObject({ ok: false, code: "NOT_AUTHORIZED" })
    expect(await saveSubjectResults(w.maths.actor, { ...base, term: "third" })).toMatchObject({ ok: false, code: "NOT_AUTHORIZED" })
    expect(await loadWorkspace(w.maths.actor, { term: "second" })).toEqual({ kind: "NOT_AUTHORIZED" })
    expect(await db.result.count()).toBe(0)
    expect(await loadPeriod("first")).not.toBeNull()
    expect(await loadPeriod("nonsense")).toBeNull()
  })

  it("the term in the form is validated and defaults to the current term", () => {
    const f = (term?: string) => {
      const d = new FormData()
      d.set("classKey", "jss-1"); d.set("subjectCode", "MTH"); d.set("intent", "draft")
      if (term !== undefined) d.set("term", term)
      return parseSaveForm(d)
    }
    expect(f()).toMatchObject({ ok: true, request: { term: "" } })
    expect(f("second")).toMatchObject({ ok: true, request: { term: "second" } })
    expect(f("2027-second")).toEqual({ ok: false })
  })
})

describe("scores: blank is not zero", () => {
  it("stores a genuine zero, keeps a blank unentered, and grades only a complete entry", async () => {
    const w = await world()
    const base = { classKey: "jss-1", subjectCode: "MTH", intent: "draft" as const }
    expect(await saveSubjectResults(w.maths.actor, { ...base, cells: cells("ZBHS/T/001", "0", "") })).toMatchObject({ ok: true })
    const entry = await db.resultEntry.findFirstOrThrow({ where: { result: { studentId: w.daniel.id } }, include: { scores: { include: { assessmentComponent: true } } } })
    expect(entry.scores.map((s) => [s.assessmentComponent.shortName, Number(s.score)])).toEqual([["CA", 0]])
    expect(entry.totalScore).toBeNull()
    expect(entry.grade).toBeNull()

    expect(await saveSubjectResults(w.maths.actor, { ...base, cells: cells("ZBHS/T/001", "0", "0") })).toMatchObject({ ok: true })
    const done = await db.resultEntry.findFirstOrThrow({ where: { result: { studentId: w.daniel.id } } })
    expect(Number(done.totalScore)).toBe(0)
    expect(done.grade).toBe("F")
  })

  it("rejects negative, over-maximum and non-numeric scores on the server and saves nothing", async () => {
    const w = await world()
    const base = { classKey: "jss-1", subjectCode: "MTH", intent: "draft" as const }
    for (const [ca, exam] of [["-1", "10"], ["41", "10"], ["10", "61"], ["abc", "10"], ["1e2", "10"]]) {
      const out = await saveSubjectResults(w.maths.actor, { ...base, cells: cells("ZBHS/T/001", ca, exam) })
      expect(out).toMatchObject({ ok: false })
    }
    expect(await db.result.count()).toBe(0)
  })
})

describe("submission rules", () => {
  it("will not submit incomplete scores and lists every missing one", async () => {
    const w = await world()
    const out = await saveSubjectResults(w.maths.actor, { classKey: "jss-1", subjectCode: "MTH", intent: "submit", cells: { "ZBHS/T/001": { CA: "30", Exam: "" }, "ZBHS/T/002": { CA: "", Exam: "" } } })
    expect(out).toMatchObject({ ok: false, code: "INVALID" })
    if (!out.ok) expect(Object.keys(out.fieldErrors).sort()).toEqual(["ZBHS/T/001::Exam", "ZBHS/T/002::CA", "ZBHS/T/002::Exam"])
    expect(await db.resultEntry.count({ where: { status: "SUBMITTED" } })).toBe(0)
  })

  it("a submitted subject is locked: later saves are refused and the stored scores do not change", async () => {
    const w = await world()
    const ok = await saveSubjectResults(w.maths.actor, { classKey: "jss-1", subjectCode: "MTH", intent: "submit", cells: { ...cells("ZBHS/T/001", "30", "50"), ...cells("ZBHS/T/002", "20", "40") } })
    expect(ok).toMatchObject({ ok: true, submittedEntries: 2 })
    const again = await saveSubjectResults(w.maths.actor, { classKey: "jss-1", subjectCode: "MTH", intent: "draft", cells: cells("ZBHS/T/001", "1", "1") })
    expect(again).toMatchObject({ ok: false, code: "LOCKED" })
    const entry = await db.resultEntry.findFirstOrThrow({ where: { result: { studentId: w.daniel.id } }, include: { scores: true } })
    expect(entry.status).toBe("SUBMITTED")
    expect(entry.scores.map((s) => Number(s.score)).sort()).toEqual([30, 50])
  })

  it("only the assigned teacher may submit, and no teacher action can publish", async () => {
    const w = await world()
    const refused = await saveSubjectResults(w.english.actor, { classKey: "jss-1", subjectCode: "MTH", intent: "submit", cells: cells("ZBHS/T/001", "30", "50") })
    expect(refused).toMatchObject({ ok: false, code: "NOT_AUTHORIZED" })
    await saveSubjectResults(w.maths.actor, { classKey: "jss-1", subjectCode: "MTH", intent: "submit", cells: cells("ZBHS/T/001", "30", "50") })
    expect(await db.result.count({ where: { status: "PUBLISHED" } })).toBe(0)
    // "publish" is not a valid intent at all.
    const f = new FormData()
    f.set("classKey", "jss-1"); f.set("subjectCode", "MTH"); f.set("intent", "publish")
    expect(parseSaveForm(f)).toEqual({ ok: false })
  })
})

describe("admin return for correction", () => {
  async function submittedClass(w: Awaited<ReturnType<typeof world>>) {
    // JSS 1 offers MTH and ENG: both teachers submit for Daniel, so his result becomes SUBMITTED.
    await saveSubjectResults(w.maths.actor, { classKey: "jss-1", subjectCode: "MTH", intent: "submit", cells: { ...cells("ZBHS/T/001", "30", "50"), ...cells("ZBHS/T/002", "20", "40") } })
    await saveSubjectResults(w.english.actor, { classKey: "jss-1", subjectCode: "ENG", intent: "submit", cells: { ...cells("ZBHS/T/001", "35", "55"), ...cells("ZBHS/T/002", "25", "45") } })
    return db.result.findFirstOrThrow({ where: { studentId: w.daniel.id } })
  }
  const req = (reason = "Please recheck the exam mark") => ({ admission: "ZBHS/T/001", termKey: "2026-2027-first", subjectCode: "MTH", reason })

  it("returns one subject to draft, keeps its scores, and lets the teacher edit and resubmit", async () => {
    const w = await world()
    expect((await submittedClass(w)).status).toBe("SUBMITTED")
    expect(await returnForCorrection({ userId: w.admin.id }, req())).toMatchObject({ ok: true })

    const result = await db.result.findFirstOrThrow({ where: { studentId: w.daniel.id }, include: { entries: { include: { subject: true, scores: true } } } })
    expect(result.status).toBe("DRAFT")
    const mth = result.entries.find((e) => e.subject.code === "MTH")
    const eng = result.entries.find((e) => e.subject.code === "ENG")
    expect([mth?.status, eng?.status]).toEqual(["DRAFT", "SUBMITTED"])
    expect(mth?.scores).toHaveLength(2)

    const log = await db.auditLog.findFirstOrThrow({ where: { action: "RESULT_RETURNED_FOR_CORRECTION" } })
    expect(JSON.stringify(log.metadata)).toContain("Please recheck")

    expect(await saveSubjectResults(w.maths.actor, { classKey: "jss-1", subjectCode: "MTH", intent: "draft", cells: cells("ZBHS/T/001", "31", "50") })).toMatchObject({ ok: true })
    expect(await saveSubjectResults(w.maths.actor, { classKey: "jss-1", subjectCode: "MTH", intent: "submit", cells: cells("ZBHS/T/001", "31", "50") })).toMatchObject({ ok: true })
    expect((await db.result.findFirstOrThrow({ where: { studentId: w.daniel.id } })).status).toBe("SUBMITTED")
  })

  it("is refused for teachers, for drafts and for published results, and needs a reason", async () => {
    const w = await world()
    await submittedClass(w)
    expect(await returnForCorrection({ userId: w.maths.user.id }, req())).toMatchObject({ ok: false, code: "NOT_AUTHORIZED" })
    expect(await returnForCorrection({ userId: w.admin.id }, req(" "))).toMatchObject({ ok: false, code: "INVALID" })
    expect((await db.result.findFirstOrThrow({ where: { studentId: w.daniel.id } })).status).toBe("SUBMITTED")

    expect(await publishResult({ userId: w.admin.id }, { admission: "ZBHS/T/001", termKey: "2026-2027-first" })).toMatchObject({ ok: true })
    expect(await returnForCorrection({ userId: w.admin.id }, req())).toMatchObject({ ok: false, code: "NOT_READY" })

    await db.result.updateMany({ where: { studentId: w.daniel.id }, data: { status: "SUBMITTED", publishedAt: null, publishedById: null } })
    await db.resultEntry.updateMany({ where: { result: { studentId: w.daniel.id }, subject: { code: "MTH" } }, data: { status: "DRAFT" } })
    expect(await returnForCorrection({ userId: w.admin.id }, req())).toMatchObject({ ok: false, code: "NOT_READY" }) // already a draft
  })
})
