import { afterAll, beforeEach, describe, expect, it } from "vitest"

import type { ResultStatus, TermName } from "@/generated/prisma/enums"
import { termKey } from "@/lib/academic"
import { db } from "@/lib/db"
import { formatScore } from "@/lib/format"
import { listAvailableTerms, loadPublishedResult, loadStudentResultView } from "@/lib/services/results"
import { resetDatabase } from "@/test/helpers"

const NOW = new Date("2026-10-07T12:00:00.000Z")

/** Distinctive values that must NEVER reach a student for an unpublished result. */
const SECRETS = ["87.31", "33.33", "SECRET-REMARK-XYZ", "QQ-GRADE", "Quantum Mathematics"]

beforeEach(resetDatabase)
afterAll(() => db.$disconnect())

// ---------------------------------------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------------------------------------

async function scheme(name: string, components: { name: string; shortName: string; maxScore: number; weight: number }[]) {
  const s = await db.gradingScheme.create({ data: { name } })
  const created = []
  for (const [i, c] of components.entries()) {
    created.push(await db.assessmentComponent.create({ data: { gradingSchemeId: s.id, sortOrder: i + 1, ...c } }))
  }
  const bands = [
    { grade: "QQ-GRADE", minScore: 50, maxScore: 100, remark: "SECRET-REMARK-XYZ", sortOrder: 1 },
    { grade: "Z", minScore: 0, maxScore: 49.99, remark: "Keep trying", sortOrder: 2 },
  ]
  for (const b of bands) await db.gradeBand.create({ data: { gradingSchemeId: s.id, ...b } })
  return { scheme: s, components: created }
}

async function school() {
  const admin = await db.user.create({
    data: { loginId: "admin.t", passwordHash: "x", role: "ADMIN", firstName: "Ada", lastName: "Min", admin: { create: {} } },
  })
  const past = await db.academicSession.create({
    data: { name: "2025/2026", startDate: new Date("2025-09-15"), endDate: new Date("2026-07-24"), isCurrent: false },
  })
  const current = await db.academicSession.create({
    data: { name: "2026/2027", startDate: new Date("2026-09-14"), endDate: new Date("2027-07-23"), isCurrent: true },
  })
  const mkTerm = (sessionId: string, name: TermName, start: string, end: string, isCurrent = false) =>
    db.term.create({ data: { sessionId, name, startDate: new Date(start), endDate: new Date(end), isCurrent } })
  const t = {
    pastFirst: await mkTerm(past.id, "FIRST", "2025-09-15", "2025-12-19"),
    pastSecond: await mkTerm(past.id, "SECOND", "2026-01-12", "2026-04-03"),
    pastThird: await mkTerm(past.id, "THIRD", "2026-04-27", "2026-07-24"),
    first: await mkTerm(current.id, "FIRST", "2026-09-14", "2026-12-18", true),
    second: await mkTerm(current.id, "SECOND", "2027-01-11", "2027-04-02"), // has not started
    third: await mkTerm(current.id, "THIRD", "2027-04-26", "2027-07-23"), // has not started
  }
  const jss1 = await db.schoolClass.create({ data: { name: "JSS 1", level: 1 } })
  const jss2 = await db.schoolClass.create({ data: { name: "JSS 2", level: 2 } })
  const maths = await db.subject.create({ data: { code: "QM", name: "Quantum Mathematics" } })
  const english = await db.subject.create({ data: { code: "ENG", name: "English Language" } })
  return { admin, past, current, t, jss1, jss2, maths, english }
}
type School = Awaited<ReturnType<typeof school>>

async function student(w: School, admission: string, first: string, last: string, sessions: { sessionId: string; classId: string }[]) {
  const user = await db.user.create({ data: { loginId: admission, passwordHash: "x", role: "STUDENT", firstName: first, lastName: last } })
  const s = await db.student.create({ data: { userId: user.id, admissionNumber: admission } })
  for (const e of sessions) await db.studentEnrollment.create({ data: { studentId: s.id, ...e } })
  return s
}

type EntrySpec = { subjectId: string; scores: number[]; total: number | null; grade: string | null; remark: string | null }
async function result(
  w: School,
  studentId: string,
  where: { sessionId: string; termId: string; classId: string },
  sch: Awaited<ReturnType<typeof scheme>>,
  status: ResultStatus,
  entries: EntrySpec[],
) {
  const r = await db.result.create({
    data: {
      studentId, ...where, gradingSchemeId: sch.scheme.id, status,
      publishedAt: status === "PUBLISHED" ? new Date("2026-10-02T10:00:00Z") : null,
      publishedById: status === "PUBLISHED" ? w.admin.id : null,
    },
  })
  for (const e of entries) {
    const entry = await db.resultEntry.create({
      data: { resultId: r.id, subjectId: e.subjectId, totalScore: e.total, grade: e.grade, remark: e.remark },
    })
    for (const [i, score] of e.scores.entries()) {
      await db.resultEntryScore.create({ data: { resultEntryId: entry.id, assessmentComponentId: sch.components[i].id, score } })
    }
  }
  return r
}

const secretEntries = (w: School): EntrySpec[] => [
  { subjectId: w.maths.id, scores: [33.33], total: 87.31, grade: "QQ-GRADE", remark: "SECRET-REMARK-XYZ" },
]
function expectNoSecrets(value: unknown) {
  const text = JSON.stringify(value)
  for (const secret of SECRETS) expect(text, `leaked "${secret}"`).not.toContain(secret)
}

// ---------------------------------------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------------------------------------

describe("published result sheet", () => {
  it("returns the student's own marks using the grading scheme's components, stored totals and grade bands", async () => {
    const w = await school()
    const sch = await scheme("Two-part", [
      { name: "Continuous Assessment", shortName: "CA", maxScore: 40, weight: 40 },
      { name: "Examination", shortName: "Exam", maxScore: 60, weight: 60 },
    ])
    const daniel = await student(w, "ZBHS/T/001", "Daniel", "Ade", [{ sessionId: w.current.id, classId: w.jss1.id }])
    await result(w, daniel.id, { sessionId: w.current.id, termId: w.t.first.id, classId: w.jss1.id }, sch, "PUBLISHED", [
      { subjectId: w.maths.id, scores: [30, 44], total: 74, grade: "QQ-GRADE", remark: "SECRET-REMARK-XYZ" },
      { subjectId: w.english.id, scores: [34, 52], total: 86, grade: "QQ-GRADE", remark: "Excellent" },
    ])

    const view = await loadStudentResultView(daniel.id, undefined, NOW)
    expect(view.kind).toBe("PUBLISHED")
    if (view.kind !== "PUBLISHED") return
    const { sheet } = view

    expect(sheet.student).toEqual({ firstName: "Daniel", lastName: "Ade", admissionNumber: "ZBHS/T/001" })
    expect(sheet.className).toBe("JSS 1")
    expect(sheet.sessionName).toBe("2026/2027")
    expect(sheet.termName).toBe("FIRST")
    expect(sheet.components.map((c) => [c.shortName, c.maxScore, c.weight])).toEqual([["CA", 40, 40], ["Exam", 60, 60]])
    expect(sheet.rows.map((r) => r.subject)).toEqual(["English Language", "Quantum Mathematics"]) // alphabetical
    expect(sheet.rows[0]).toEqual({ subject: "English Language", scores: [34, 52], total: 86, grade: "QQ-GRADE", remark: "Excellent" })
    expect(sheet.gradeKey).toEqual([
      { grade: "QQ-GRADE", minScore: 50, maxScore: 100, remark: "SECRET-REMARK-XYZ" },
      { grade: "Z", minScore: 0, maxScore: 49.99, remark: "Keep trying" },
    ])
  })

  it("builds its columns from whatever components the result's scheme has (not just CA and Exam)", async () => {
    const w = await school()
    const sch = await scheme("Five-part", [
      { name: "Test 1", shortName: "T1", maxScore: 10, weight: 10 },
      { name: "Test 2", shortName: "T2", maxScore: 10, weight: 10 },
      { name: "Practical", shortName: "Prac", maxScore: 20, weight: 20 },
      { name: "Project", shortName: "Proj", maxScore: 20, weight: 20 },
      { name: "Exam", shortName: "Exam", maxScore: 40, weight: 40 },
    ])
    const s = await student(w, "ZBHS/T/001", "Daniel", "Ade", [{ sessionId: w.current.id, classId: w.jss1.id }])
    await result(w, s.id, { sessionId: w.current.id, termId: w.t.first.id, classId: w.jss1.id }, sch, "PUBLISHED", [
      { subjectId: w.maths.id, scores: [8, 9, 15, 18, 30], total: 80, grade: "QQ-GRADE", remark: "ok" },
    ])
    const view = await loadStudentResultView(s.id, undefined, NOW)
    if (view.kind !== "PUBLISHED") throw new Error("expected published")
    expect(view.sheet.components.map((c) => c.shortName)).toEqual(["T1", "T2", "Prac", "Proj", "Exam"])
    expect(view.sheet.rows[0].scores).toEqual([8, 9, 15, 18, 30])
  })

  it("uses each result's OWN scheme, so an old term keeps its old columns and grade key", async () => {
    const w = await school()
    const oldScheme = await scheme("Old", [{ name: "Exam only", shortName: "Exam", maxScore: 100, weight: 100 }])
    const newScheme = await scheme("New", [
      { name: "CA", shortName: "CA", maxScore: 40, weight: 40 },
      { name: "Exam", shortName: "Exam", maxScore: 60, weight: 60 },
    ])
    const s = await student(w, "ZBHS/T/001", "Daniel", "Ade", [
      { sessionId: w.past.id, classId: w.jss1.id }, { sessionId: w.current.id, classId: w.jss2.id },
    ])
    await result(w, s.id, { sessionId: w.past.id, termId: w.t.pastThird.id, classId: w.jss1.id }, oldScheme, "PUBLISHED", [
      { subjectId: w.maths.id, scores: [61], total: 61, grade: "QQ-GRADE", remark: "ok" },
    ])
    await result(w, s.id, { sessionId: w.current.id, termId: w.t.first.id, classId: w.jss2.id }, newScheme, "PUBLISHED", [
      { subjectId: w.maths.id, scores: [30, 40], total: 70, grade: "QQ-GRADE", remark: "ok" },
    ])
    const older = await loadStudentResultView(s.id, termKey("2025/2026", "THIRD"), NOW)
    const newer = await loadStudentResultView(s.id, termKey("2026/2027", "FIRST"), NOW)
    if (older.kind !== "PUBLISHED" || newer.kind !== "PUBLISHED") throw new Error("expected both published")
    expect(older.sheet.components.map((c) => c.shortName)).toEqual(["Exam"])
    expect(newer.sheet.components.map((c) => c.shortName)).toEqual(["CA", "Exam"])
    expect(older.sheet.className).toBe("JSS 1") // the class at the time, not the current class
    expect(newer.sheet.className).toBe("JSS 2")
  })

  it("summarises from the stored totals: subject count, overall total, average and grade counts", async () => {
    const w = await school()
    const sch = await scheme("S", [{ name: "Exam", shortName: "Exam", maxScore: 100, weight: 100 }])
    const eng2 = await db.subject.create({ data: { code: "CVE", name: "Civic Education" } })
    const s = await student(w, "ZBHS/T/001", "Daniel", "Ade", [{ sessionId: w.current.id, classId: w.jss1.id }])
    await result(w, s.id, { sessionId: w.current.id, termId: w.t.first.id, classId: w.jss1.id }, sch, "PUBLISHED", [
      { subjectId: w.maths.id, scores: [70.5], total: 70.5, grade: "QQ-GRADE", remark: "a" },
      { subjectId: w.english.id, scores: [30], total: 30, grade: "Z", remark: "b" },
      { subjectId: eng2.id, scores: [60], total: 60, grade: "QQ-GRADE", remark: "c" },
    ])
    const view = await loadStudentResultView(s.id, undefined, NOW)
    if (view.kind !== "PUBLISHED") throw new Error("expected published")
    expect(view.sheet.summary).toEqual({
      subjectCount: 3,
      overallTotal: 160.5,
      average: 53.5,
      gradeCounts: [{ grade: "QQ-GRADE", count: 2 }, { grade: "Z", count: 1 }], // order of the scheme's grade bands
    })
  })

  it("handles a subject with no total or a missing score without inventing numbers", async () => {
    const w = await school()
    const sch = await scheme("S", [
      { name: "CA", shortName: "CA", maxScore: 40, weight: 40 },
      { name: "Exam", shortName: "Exam", maxScore: 60, weight: 60 },
    ])
    const s = await student(w, "ZBHS/T/001", "Daniel", "Ade", [{ sessionId: w.current.id, classId: w.jss1.id }])
    await result(w, s.id, { sessionId: w.current.id, termId: w.t.first.id, classId: w.jss1.id }, sch, "PUBLISHED", [
      { subjectId: w.maths.id, scores: [20], total: null, grade: null, remark: null }, // only CA recorded
    ])
    const view = await loadStudentResultView(s.id, undefined, NOW)
    if (view.kind !== "PUBLISHED") throw new Error("expected published")
    expect(view.sheet.rows[0]).toEqual({ subject: "Quantum Mathematics", scores: [20, null], total: null, grade: null, remark: null })
    expect(view.sheet.summary).toMatchObject({ subjectCount: 1, overallTotal: null, average: null, gradeCounts: [] })
  })
})

describe("unpublished results never leak", () => {
  it.each(["DRAFT", "SUBMITTED"] as const)("a %s result for the selected term returns status only, with no marks anywhere", async (status) => {
    const w = await school()
    const sch = await scheme("S", [{ name: "CA", shortName: "CA", maxScore: 40, weight: 40 }, { name: "Exam", shortName: "Exam", maxScore: 60, weight: 60 }])
    const s = await student(w, "ZBHS/T/001", "Grace", "Bello", [{ sessionId: w.current.id, classId: w.jss1.id }])
    await result(w, s.id, { sessionId: w.current.id, termId: w.t.first.id, classId: w.jss1.id }, sch, status, secretEntries(w))

    const view = await loadStudentResultView(s.id, undefined, NOW)
    expect(view.kind).toBe("NOT_PUBLISHED")
    expect(view).not.toHaveProperty("sheet")
    expectNoSecrets(view)
    expect(JSON.stringify(view)).not.toMatch(/totalScore|remark|"grade"|"score"|entries|rows/i)
  })

  it("a term with no result at all also reads as not published", async () => {
    const w = await school()
    const s = await student(w, "ZBHS/T/001", "David", "Peter", [{ sessionId: w.current.id, classId: w.jss1.id }])
    expect((await loadStudentResultView(s.id, undefined, NOW)).kind).toBe("NOT_PUBLISHED")
  })

  it("loadPublishedResult itself refuses unpublished results", async () => {
    const w = await school()
    const sch = await scheme("S", [{ name: "Exam", shortName: "Exam", maxScore: 100, weight: 100 }])
    const s = await student(w, "ZBHS/T/001", "Grace", "Bello", [{ sessionId: w.current.id, classId: w.jss1.id }])
    const r = await result(w, s.id, { sessionId: w.current.id, termId: w.t.first.id, classId: w.jss1.id }, sch, "SUBMITTED", secretEntries(w))
    expect(await loadPublishedResult(s.id, { sessionId: w.current.id, termId: w.t.first.id })).toBeNull()
    await db.result.update({ where: { id: r.id }, data: { status: "PUBLISHED" } })
    expect(await loadPublishedResult(s.id, { sessionId: w.current.id, termId: w.t.first.id })).not.toBeNull()
  })

  it("an unpublished past term shows as not published while a published past term opens", async () => {
    const w = await school()
    const sch = await scheme("S", [{ name: "Exam", shortName: "Exam", maxScore: 100, weight: 100 }])
    const s = await student(w, "ZBHS/T/001", "Samuel", "James", [{ sessionId: w.past.id, classId: w.jss1.id }, { sessionId: w.current.id, classId: w.jss2.id }])
    await result(w, s.id, { sessionId: w.past.id, termId: w.t.pastSecond.id, classId: w.jss1.id }, sch, "DRAFT", secretEntries(w))
    await result(w, s.id, { sessionId: w.past.id, termId: w.t.pastThird.id, classId: w.jss1.id }, sch, "PUBLISHED", [
      { subjectId: w.english.id, scores: [64], total: 64, grade: "QQ-GRADE", remark: "ok" },
    ])
    const draft = await loadStudentResultView(s.id, termKey("2025/2026", "SECOND"), NOW)
    expect(draft.kind).toBe("NOT_PUBLISHED")
    expectNoSecrets(draft)
    expect((await loadStudentResultView(s.id, termKey("2025/2026", "THIRD"), NOW)).kind).toBe("PUBLISHED")
  })
})

describe("whose results", () => {
  it("never returns another student's published result, whatever term key is asked for", async () => {
    const w = await school()
    const sch = await scheme("S", [{ name: "Exam", shortName: "Exam", maxScore: 100, weight: 100 }])
    const daniel = await student(w, "ZBHS/T/001", "Daniel", "Ade", [{ sessionId: w.current.id, classId: w.jss1.id }])
    const grace = await student(w, "ZBHS/T/002", "Grace", "Bello", [{ sessionId: w.current.id, classId: w.jss1.id }])
    await result(w, daniel.id, { sessionId: w.current.id, termId: w.t.first.id, classId: w.jss1.id }, sch, "PUBLISHED", [
      { subjectId: w.maths.id, scores: [87], total: 87.31, grade: "QQ-GRADE", remark: "SECRET-REMARK-XYZ" },
    ])

    const forGrace = await loadStudentResultView(grace.id, termKey("2026/2027", "FIRST"), NOW)
    expect(forGrace.kind).toBe("NOT_PUBLISHED") // same term key, but it is Grace's own (empty) result
    expectNoSecrets(forGrace)
    expect(JSON.stringify(forGrace)).not.toContain("Daniel")
    expect(JSON.stringify(forGrace)).not.toContain("ZBHS/T/001")
  })

  it("rejects a term key for a session the student does not belong to", async () => {
    const w = await school()
    const sch = await scheme("S", [{ name: "Exam", shortName: "Exam", maxScore: 100, weight: 100 }])
    const other = await student(w, "ZBHS/T/001", "Daniel", "Ade", [{ sessionId: w.past.id, classId: w.jss1.id }])
    await result(w, other.id, { sessionId: w.past.id, termId: w.t.pastThird.id, classId: w.jss1.id }, sch, "PUBLISHED", secretEntries(w))
    const me = await student(w, "ZBHS/T/002", "Grace", "Bello", [{ sessionId: w.current.id, classId: w.jss1.id }])
    const view = await loadStudentResultView(me.id, termKey("2025/2026", "THIRD"), NOW)
    expect(view.kind).toBe("UNKNOWN_TERM")
    expectNoSecrets(view)
  })

  it.each(["", "../etc/passwd", "2026-2027-first; DROP TABLE", "a".repeat(200), "cm0abc123", "2026-2027-FIRST", "ZBHS/2026/001"])(
    "treats a malformed or unknown term key (%j) as unknown",
    async (key) => {
      const w = await school()
      const s = await student(w, "ZBHS/T/001", "Daniel", "Ade", [{ sessionId: w.current.id, classId: w.jss1.id }])
      expect((await loadStudentResultView(s.id, key, NOW)).kind).toBe("UNKNOWN_TERM")
    },
  )

  it("reports NO_TERMS for a student with no enrolment and no published result", async () => {
    await school()
    const lonely = await db.user.create({ data: { loginId: "x", passwordHash: "x", role: "STUDENT", firstName: "L", lastName: "L" } })
    const st = await db.student.create({ data: { userId: lonely.id, admissionNumber: "ZBHS/T/999" } })
    expect((await loadStudentResultView(st.id, undefined, NOW)).kind).toBe("NO_TERMS")
  })

  it("returns UNKNOWN_TERM / NO_TERMS style results for an unknown student ID, never anything else", async () => {
    await school()
    expect((await loadStudentResultView("does-not-exist", undefined, NOW)).kind).toBe("NO_TERMS")
  })
})

describe("available terms", () => {
  it("lists started terms of the student's own sessions, newest first, and flags the current one", async () => {
    const w = await school()
    const s = await student(w, "ZBHS/T/001", "Samuel", "James", [{ sessionId: w.past.id, classId: w.jss1.id }, { sessionId: w.current.id, classId: w.jss2.id }])
    const terms = await listAvailableTerms(s.id, NOW)
    expect(terms.map((t) => t.key)).toEqual([
      "2026-2027-first", "2025-2026-third", "2025-2026-second", "2025-2026-first",
    ]) // the current session's Second and Third terms have not started
    expect(terms.filter((t) => t.isCurrent).map((t) => t.key)).toEqual(["2026-2027-first"])
  })

  it("does not list sessions the student was never part of", async () => {
    const w = await school()
    const s = await student(w, "ZBHS/T/001", "Daniel", "Ade", [{ sessionId: w.current.id, classId: w.jss1.id }])
    expect((await listAvailableTerms(s.id, NOW)).map((t) => t.key)).toEqual(["2026-2027-first"])
  })

  it("a future term with only a DRAFT result is not listed; with a PUBLISHED result it is", async () => {
    const w = await school()
    const sch = await scheme("S", [{ name: "Exam", shortName: "Exam", maxScore: 100, weight: 100 }])
    const s = await student(w, "ZBHS/T/001", "Daniel", "Ade", [{ sessionId: w.current.id, classId: w.jss1.id }])
    const draft = await result(w, s.id, { sessionId: w.current.id, termId: w.t.second.id, classId: w.jss1.id }, sch, "DRAFT", secretEntries(w))
    expect((await listAvailableTerms(s.id, NOW)).map((t) => t.key)).not.toContain("2026-2027-second")
    await db.result.update({ where: { id: draft.id }, data: { status: "PUBLISHED" } })
    expect((await listAvailableTerms(s.id, NOW)).map((t) => t.key)).toContain("2026-2027-second")
  })

  it("defaults to the current term, or the newest term when the current one is not available", async () => {
    const w = await school()
    const s = await student(w, "ZBHS/T/001", "Samuel", "James", [{ sessionId: w.past.id, classId: w.jss1.id }, { sessionId: w.current.id, classId: w.jss2.id }])
    const view = await loadStudentResultView(s.id, undefined, NOW)
    expect(view.kind === "NOT_PUBLISHED" && view.selected.key).toBe("2026-2027-first")

    const onlyPast = await student(w, "ZBHS/T/002", "Esther", "Cole", [{ sessionId: w.past.id, classId: w.jss1.id }])
    const view2 = await loadStudentResultView(onlyPast.id, undefined, NOW)
    expect(view2.kind === "NOT_PUBLISHED" && view2.selected.key).toBe("2025-2026-third")
  })

  it("exposes no database IDs", async () => {
    const w = await school()
    const s = await student(w, "ZBHS/T/001", "Daniel", "Ade", [{ sessionId: w.current.id, classId: w.jss1.id }])
    const text = JSON.stringify(await loadStudentResultView(s.id, undefined, NOW))
    for (const id of [s.id, w.current.id, w.t.first.id, w.jss1.id]) expect(text).not.toContain(id)
  })
})

describe("formatScore", () => {
  it.each([[86, "86"], [33.5, "33.5"], [33.55, "33.55"], [70.5, "70.5"], [0, "0"], [100, "100"]])("%s -> %s", (n, text) => {
    expect(formatScore(n)).toBe(text)
  })
})
