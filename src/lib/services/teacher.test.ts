import { afterAll, beforeEach, describe, expect, it } from "vitest"

import { db } from "@/lib/db"
import { loadStudentResultView } from "@/lib/services/results"
import { loadStudentDashboard } from "@/lib/services/student-dashboard"
import { saveSubjectResults, type SaveRequest } from "@/lib/services/teacher-results"
import { filterRoster, loadTeacherOverview, loadWorkspace, type Actor } from "@/lib/services/teacher-workspace"
import { parseSaveForm } from "@/lib/validation/teacher"
import { resetDatabase } from "@/test/helpers"

const NOW = new Date("2026-10-07T12:00:00.000Z")

beforeEach(resetDatabase)
afterAll(() => db.$disconnect())

// ---------------------------------------------------------------------------------------------------------
// Fixtures: two teachers with different assignments, three classes, three subjects, four students
// ---------------------------------------------------------------------------------------------------------

async function world() {
  const admin = await db.user.create({ data: { loginId: "admin.t", passwordHash: "x", role: "ADMIN", firstName: "Ada", lastName: "Min", admin: { create: {} } } })
  const past = await db.academicSession.create({ data: { name: "2025/2026", startDate: new Date("2025-09-15"), endDate: new Date("2026-07-24"), isCurrent: false } })
  const session = await db.academicSession.create({ data: { name: "2026/2027", startDate: new Date("2026-09-14"), endDate: new Date("2027-07-23"), isCurrent: true } })
  const term = await db.term.create({ data: { name: "FIRST", sessionId: session.id, startDate: new Date("2026-09-14"), endDate: new Date("2026-12-18"), isCurrent: true } })

  const jss1 = await db.schoolClass.create({ data: { name: "JSS 1", level: 1 } })
  const jss2 = await db.schoolClass.create({ data: { name: "JSS 2", level: 2 } })
  const ss1 = await db.schoolClass.create({ data: { name: "SS 1", level: 4 } })
  const mth = await db.subject.create({ data: { code: "MTH", name: "Mathematics" } })
  const eng = await db.subject.create({ data: { code: "ENG", name: "English Language" } })
  const bio = await db.subject.create({ data: { code: "BIO", name: "Biology" } })

  const scheme = await db.gradingScheme.create({ data: { name: "Standard", isDefault: true } })
  const ca = await db.assessmentComponent.create({ data: { gradingSchemeId: scheme.id, name: "Continuous Assessment", shortName: "CA", maxScore: 40, weight: 40, sortOrder: 1 } })
  const exam = await db.assessmentComponent.create({ data: { gradingSchemeId: scheme.id, name: "Examination", shortName: "Exam", maxScore: 60, weight: 60, sortOrder: 2 } })
  for (const b of [
    { grade: "A", minScore: 70, maxScore: 100, remark: "Excellent", sortOrder: 1 },
    { grade: "B", minScore: 60, maxScore: 69.99, remark: "Very Good", sortOrder: 2 },
    { grade: "F", minScore: 0, maxScore: 59.99, remark: "Below pass", sortOrder: 3 },
  ]) await db.gradeBand.create({ data: { gradingSchemeId: scheme.id, ...b } })

  const mkTeacher = async (loginId: string, employeeNumber: string, first: string) => {
    const user = await db.user.create({ data: { loginId, passwordHash: "x", role: "TEACHER", firstName: first, lastName: "Teacher" } })
    const teacher = await db.teacher.create({ data: { userId: user.id, employeeNumber } })
    return { user, teacher, actor: { teacherId: teacher.id, userId: user.id } satisfies Actor }
  }
  const maths = await mkTeacher("teacher.math", "T1", "Peter")
  const english = await mkTeacher("teacher.english", "T2", "Ngozi")

  const assign = (t: { teacher: { id: string } }, classId: string, subjectId: string, sessionId = session.id) =>
    db.teacherAssignment.create({ data: { teacherId: t.teacher.id, classId, subjectId, sessionId } })
  await assign(maths, jss1.id, mth.id)
  await assign(maths, jss2.id, mth.id)
  await assign(english, jss1.id, eng.id)
  await assign(english, ss1.id, eng.id)
  await assign(maths, ss1.id, mth.id, past.id) // last session only: must NOT authorize anything now

  for (const [classId, subjectId] of [[jss1.id, mth.id], [jss1.id, eng.id], [jss2.id, mth.id], [ss1.id, eng.id], [ss1.id, bio.id]]) {
    await db.classSubject.create({ data: { classId, subjectId, sessionId: session.id } })
  }

  const mkStudent = async (admission: string, first: string, last: string, classId: string) => {
    const user = await db.user.create({ data: { loginId: admission, passwordHash: "x", role: "STUDENT", firstName: first, lastName: last } })
    const student = await db.student.create({ data: { userId: user.id, admissionNumber: admission } })
    await db.studentEnrollment.create({ data: { studentId: student.id, classId, sessionId: session.id } })
    return student
  }
  const daniel = await mkStudent("ZBHS/T/001", "Daniel", "Ade", jss1.id)
  const grace = await mkStudent("ZBHS/T/002", "Grace", "Bello", jss1.id)
  const samuel = await mkStudent("ZBHS/T/003", "Samuel", "James", jss2.id)
  const esther = await mkStudent("ZBHS/T/004", "Esther", "Cole", ss1.id)

  return { admin, session, term, jss1, jss2, ss1, mth, eng, bio, scheme, ca, exam, maths, english, daniel, grace, samuel, esther }
}

const req = (classKey: string, subjectCode: string, intent: "draft" | "submit", cells: SaveRequest["cells"]): SaveRequest => ({ classKey, subjectCode, intent, cells })
const row = (ca: string, exam: string) => ({ CA: ca, Exam: exam })

async function auditActions(userId?: string) {
  const rows = await db.auditLog.findMany({ where: userId ? { userId } : {}, orderBy: { createdAt: "asc" } })
  return rows.map((r) => r.action)
}

// ---------------------------------------------------------------------------------------------------------
// Authorization
// ---------------------------------------------------------------------------------------------------------

describe("authorization: a teacher only reaches their own assignments", () => {
  it("lists only the signed-in teacher's assignments for the current session", async () => {
    const w = await world()
    const math = await loadWorkspace(w.maths.actor, {})
    if (math.kind !== "READY") throw new Error("expected READY")
    expect(math.options.map((o) => [o.classKey, o.subjects.map((s) => s.code)])).toEqual([["jss-1", ["MTH"]], ["jss-2", ["MTH"]]])
    // last session's SS 1 assignment grants nothing now
    expect(math.options.map((o) => o.classKey)).not.toContain("ss-1")

    const eng = await loadWorkspace(w.english.actor, {})
    if (eng.kind !== "READY") throw new Error("expected READY")
    expect(eng.options.map((o) => [o.classKey, o.subjects.map((s) => s.code)])).toEqual([["jss-1", ["ENG"]], ["ss-1", ["ENG"]]])
  })

  it.each([
    ["Teacher B's class and subject", "jss-1", "ENG"],
    ["a class they teach, but a subject they do not", "jss-1", "BIO"],
    ["a subject they teach, but in a class they are not assigned to", "ss-1", "MTH"],
    ["a class from last session only", "ss-1", "MTH"],
    ["a class that exists but is not theirs", "ss-1", "BIO"],
    ["nonsense keys", "no-such-class", "XXX"],
    ["an attempt to smuggle SQL", "jss-1'; DROP TABLE \"User\";--", "MTH"],
    ["an ID-looking value", "cm0abc123def", "cm0xyz789"],
  ])("refuses %s (%s / %s) and records the attempt", async (_label, classKey, subjectCode) => {
    const w = await world()
    const view = await loadWorkspace(w.maths.actor, { classKey, subjectCode })
    expect(view.kind).toBe("NOT_AUTHORIZED")
    expect(JSON.stringify(view)).not.toContain("Daniel") // no student data comes back with a refusal
    const log = await db.auditLog.findFirstOrThrow({ where: { action: "TEACHER_ACCESS_DENIED" } })
    expect(log.userId).toBe(w.maths.user.id)
  })

  it("never returns another class's students", async () => {
    const w = await world()
    const view = await loadWorkspace(w.maths.actor, { classKey: "jss-2", subjectCode: "MTH" })
    if (view.kind !== "READY") throw new Error("expected READY")
    expect(view.rows.map((r) => r.admissionNumber)).toEqual(["ZBHS/T/003"]) // only JSS 2's student
    const text = JSON.stringify(view)
    for (const other of ["Daniel", "Grace", "Esther", "ZBHS/T/001", "ZBHS/T/002", "ZBHS/T/004"]) expect(text).not.toContain(other)
  })

  it("a teacher with no assignments gets an empty workspace, not an error or anyone's data", async () => {
    const w = await world()
    const user = await db.user.create({ data: { loginId: "teacher.new", passwordHash: "x", role: "TEACHER", firstName: "New", lastName: "Teacher" } })
    const teacher = await db.teacher.create({ data: { userId: user.id, employeeNumber: "T9" } })
    const view = await loadWorkspace({ teacherId: teacher.id, userId: user.id }, {})
    expect(view.kind).toBe("NO_ASSIGNMENTS")
    expect((await loadTeacherOverview(teacher.id)).assignments).toEqual([])
    expect(w.session.id).toBeTruthy()
  })

  it("shows only this subject's entries, never a colleague's marks for the same student", async () => {
    const w = await world()
    await saveSubjectResults(w.english.actor, req("jss-1", "ENG", "draft", { "ZBHS/T/001": row("39", "58") }))
    await saveSubjectResults(w.maths.actor, req("jss-1", "MTH", "draft", { "ZBHS/T/001": row("10", "20") }))
    const view = await loadWorkspace(w.maths.actor, { classKey: "jss-1", subjectCode: "MTH" })
    if (view.kind !== "READY") throw new Error("expected READY")
    const daniel = view.rows.find((r) => r.admissionNumber === "ZBHS/T/001")!
    expect(daniel.scores).toEqual({ CA: 10, Exam: 20 }) // Mathematics only
    expect(JSON.stringify(view)).not.toContain("58")
  })
})

describe("student search inside the authorized class", () => {
  it("finds students by first name, last name, admission number or several words, ignoring case", async () => {
    const w = await world()
    const find = async (query: string) => {
      const v = await loadWorkspace(w.maths.actor, { classKey: "jss-1", subjectCode: "MTH", query })
      if (v.kind !== "READY") throw new Error("expected READY")
      return v.rows.map((r) => r.admissionNumber)
    }
    expect(await find("daniel")).toEqual(["ZBHS/T/001"])
    expect(await find("BELLO")).toEqual(["ZBHS/T/002"])
    expect(await find("T/002")).toEqual(["ZBHS/T/002"])
    expect(await find("ade dan")).toEqual(["ZBHS/T/001"])
    expect(await find("  ")).toEqual(["ZBHS/T/001", "ZBHS/T/002"]) // blank = everyone in the class
    expect(await find("zzz")).toEqual([])
  })

  it("can only ever return students of the authorized class, even when the text matches someone elsewhere", async () => {
    const w = await world()
    for (const query of ["Esther", "Samuel", "ZBHS/T/004", "ZBHS/T/003", "Cole James"]) {
      const v = await loadWorkspace(w.maths.actor, { classKey: "jss-1", subjectCode: "MTH", query })
      if (v.kind !== "READY") throw new Error("expected READY")
      expect(v.rows).toEqual([])
      expect(v.totalStudents).toBe(2)
    }
  })

  it("filterRoster is a pure filter over the rows it is given", () => {
    const rows = [
      { firstName: "Daniel", lastName: "Ade", admissionNumber: "A/1" },
      { firstName: "Grace", lastName: "Bello", admissionNumber: "A/2" },
    ]
    expect(filterRoster(rows, "ace")).toHaveLength(1)
    expect(filterRoster(rows, "")).toHaveLength(2)
    expect(filterRoster(rows, "a b").map((r) => r.firstName)).toEqual(["Grace"])
  })
})

// ---------------------------------------------------------------------------------------------------------
// Saving drafts
// ---------------------------------------------------------------------------------------------------------

describe("save draft", () => {
  it("stores DRAFT entries with a server-calculated total, grade and remark, and logs the action", async () => {
    const w = await world()
    const out = await saveSubjectResults(w.maths.actor, req("jss-1", "MTH", "draft", { "ZBHS/T/001": row("34", "52"), "ZBHS/T/002": row("20", "30") }))
    expect(out).toMatchObject({ ok: true, changedEntries: 2 })

    const entries = await db.resultEntry.findMany({ include: { result: true, scores: true }, orderBy: { totalScore: "desc" } })
    expect(entries).toHaveLength(2)
    expect(entries.map((e) => [e.totalScore?.toNumber(), e.grade, e.remark, e.status])).toEqual([
      [86, "A", "Excellent", "DRAFT"],
      [50, "F", "Below pass", "DRAFT"],
    ])
    for (const e of entries) {
      expect(e.result.status).toBe("DRAFT")
      expect(e.result.publishedAt).toBeNull()
      expect(e.scores).toHaveLength(2)
    }

    const actions = await auditActions(w.maths.user.id)
    expect(actions.filter((a) => a === "TEACHER_SCORE_CHANGED")).toHaveLength(2)
    expect(actions.filter((a) => a === "TEACHER_RESULT_DRAFT_SAVED")).toHaveLength(1)
  })

  it("writes useful audit metadata and nothing sensitive", async () => {
    const w = await world()
    await saveSubjectResults(w.maths.actor, req("jss-1", "MTH", "draft", { "ZBHS/T/001": row("34", "52") }))
    const change = await db.auditLog.findFirstOrThrow({ where: { action: "TEACHER_SCORE_CHANGED" } })
    expect(change.userId).toBe(w.maths.user.id)
    expect(change.entityType).toBe("ResultEntry")
    expect(change.entityId).toBeTruthy()
    expect(change.metadata).toMatchObject({
      class: "JSS 1", subject: "MTH", term: "FIRST", session: "2026/2027", admissionNumber: "ZBHS/T/001",
      changes: [{ component: "CA", from: null, to: 34 }, { component: "Exam", from: null, to: 52 }],
    })
    const everything = JSON.stringify(await db.auditLog.findMany())
    expect(everything).not.toMatch(/password|token|hash/i)
  })

  it("logs a later score change with the old and the new value", async () => {
    const w = await world()
    await saveSubjectResults(w.maths.actor, req("jss-1", "MTH", "draft", { "ZBHS/T/001": row("34", "52") }))
    await saveSubjectResults(w.maths.actor, req("jss-1", "MTH", "draft", { "ZBHS/T/001": row("34", "55") }))
    const changes = await db.auditLog.findMany({ where: { action: "TEACHER_SCORE_CHANGED" }, orderBy: { createdAt: "asc" } })
    expect(changes).toHaveLength(2)
    expect(changes[1].metadata).toMatchObject({ changes: [{ component: "Exam", from: 52, to: 55 }] })
  })

  it("saving identical values again changes nothing and adds no audit noise", async () => {
    const w = await world()
    const same = req("jss-1", "MTH", "draft", { "ZBHS/T/001": row("34", "52") })
    await saveSubjectResults(w.maths.actor, same)
    const before = await db.auditLog.count()
    const again = await saveSubjectResults(w.maths.actor, same)
    expect(again).toMatchObject({ ok: true, changedEntries: 0, message: "No changes to save." })
    expect(await db.auditLog.count()).toBe(before)
  })

  it("accepts a partly filled row, giving it no total or grade until it is complete", async () => {
    const w = await world()
    await saveSubjectResults(w.maths.actor, req("jss-1", "MTH", "draft", { "ZBHS/T/001": row("30", "") }))
    const entry = await db.resultEntry.findFirstOrThrow({ include: { scores: true } })
    expect(entry.scores).toHaveLength(1)
    expect([entry.totalScore, entry.grade, entry.remark, entry.status]).toEqual([null, null, null, "DRAFT"])
  })

  it("does not create an empty entry for a student whose row was left blank", async () => {
    const w = await world()
    await saveSubjectResults(w.maths.actor, req("jss-1", "MTH", "draft", { "ZBHS/T/001": row("34", "52"), "ZBHS/T/002": row("", "") }))
    expect(await db.resultEntry.count()).toBe(1)
  })

  it("lets a teacher clear a score they entered", async () => {
    const w = await world()
    await saveSubjectResults(w.maths.actor, req("jss-1", "MTH", "draft", { "ZBHS/T/001": row("34", "52") }))
    await saveSubjectResults(w.maths.actor, req("jss-1", "MTH", "draft", { "ZBHS/T/001": row("34", "") }))
    const entry = await db.resultEntry.findFirstOrThrow({ include: { scores: true } })
    expect(entry.scores).toHaveLength(1)
    expect(entry.totalScore).toBeNull()
    expect(entry.grade).toBeNull()
  })

  it("two teachers add their own subjects to the SAME student result without disturbing each other", async () => {
    const w = await world()
    await saveSubjectResults(w.maths.actor, req("jss-1", "MTH", "draft", { "ZBHS/T/001": row("30", "40") }))
    await saveSubjectResults(w.english.actor, req("jss-1", "ENG", "draft", { "ZBHS/T/001": row("35", "50") }))
    expect(await db.result.count()).toBe(1)
    expect(await db.resultEntry.count()).toBe(2)
  })
})

// ---------------------------------------------------------------------------------------------------------
// Validation (server side)
// ---------------------------------------------------------------------------------------------------------

describe("validation: nothing is saved unless every value is valid", () => {
  it.each([
    ["negative", "-1", "Score cannot be negative."],
    ["above the maximum", "41", "Cannot be more than 40."],
    ["not a number", "abc", "Enter a number."],
    ["scientific notation", "1e1", "Enter a number."],
    ["too many decimals", "3.456", "Use at most 2 decimal places."],
  ])("rejects a %s CA score and writes nothing", async (_label, value, message) => {
    const w = await world()
    const out = await saveSubjectResults(w.maths.actor, req("jss-1", "MTH", "draft", { "ZBHS/T/001": row("34", "52"), "ZBHS/T/002": row(value, "30") }))
    expect(out.ok).toBe(false)
    if (out.ok) return
    expect(out.fieldErrors["ZBHS/T/002::CA"]).toBe(message)
    // all or nothing: the VALID row for Daniel was not saved either
    expect(await db.result.count()).toBe(0)
    expect(await db.resultEntry.count()).toBe(0)
    expect(await auditActions()).not.toContain("TEACHER_RESULT_DRAFT_SAVED")
  })

  it("accepts exactly the maximum and exactly zero", async () => {
    const w = await world()
    const out = await saveSubjectResults(w.maths.actor, req("jss-1", "MTH", "draft", { "ZBHS/T/001": row("40", "60"), "ZBHS/T/002": row("0", "0") }))
    expect(out.ok).toBe(true)
    const totals = (await db.resultEntry.findMany({ orderBy: { totalScore: "desc" } })).map((e) => e.totalScore?.toNumber())
    expect(totals).toEqual([100, 0])
  })

  it("refuses an assessment component that is not in the grading scheme", async () => {
    const w = await world()
    const out = await saveSubjectResults(w.maths.actor, req("jss-1", "MTH", "draft", { "ZBHS/T/001": { CA: "30", Exam: "40", Bonus: "100" } }))
    expect(out).toMatchObject({ ok: false, code: "INVALID" })
    expect(await db.resultEntry.count()).toBe(0)
  })

  it("ignores any total, grade or remark a browser might add: it only recalculates from the scores", async () => {
    const w = await world()
    // the parser only reads score:: cells, so these extra fields never reach the service
    const form = new FormData()
    form.set("classKey", "jss-1"); form.set("subjectCode", "MTH"); form.set("intent", "draft")
    form.set("score::ZBHS/T/001::CA", "10"); form.set("score::ZBHS/T/001::Exam", "10")
    form.set("total::ZBHS/T/001", "100"); form.set("grade::ZBHS/T/001", "A"); form.set("remark::ZBHS/T/001", "Perfect")
    const parsed = parseSaveForm(form)
    if (!parsed.ok) throw new Error("expected a parsed form")
    await saveSubjectResults(w.maths.actor, parsed.request)
    const entry = await db.resultEntry.findFirstOrThrow()
    expect([entry.totalScore?.toNumber(), entry.grade]).toEqual([20, "F"])
  })
})

describe("authorization on save", () => {
  it("refuses a class and subject that belong to another teacher, writes nothing and logs it", async () => {
    const w = await world()
    const out = await saveSubjectResults(w.maths.actor, req("jss-1", "ENG", "draft", { "ZBHS/T/001": row("40", "60") }))
    expect(out).toMatchObject({ ok: false, code: "NOT_AUTHORIZED" })
    expect(await db.result.count()).toBe(0)
    expect(await auditActions(w.maths.user.id)).toEqual(["TEACHER_ACCESS_DENIED"])
  })

  it.each([
    ["an unassigned subject", "jss-1", "BIO"],
    ["an unassigned class", "ss-1", "MTH"],
    ["last session's assignment", "ss-1", "MTH"],
    ["made-up keys", "x", "y"],
  ])("refuses %s", async (_label, classKey, subjectCode) => {
    const w = await world()
    const out = await saveSubjectResults(w.maths.actor, req(classKey, subjectCode, "draft", { "ZBHS/T/001": row("1", "1") }))
    expect(out).toMatchObject({ ok: false, code: "NOT_AUTHORIZED" })
    expect(await db.resultEntry.count()).toBe(0)
  })

  it("refuses a request that names a student from another class, even inside an authorized class and subject", async () => {
    const w = await world()
    const out = await saveSubjectResults(w.maths.actor, req("jss-1", "MTH", "draft", { "ZBHS/T/001": row("30", "40"), "ZBHS/T/004": row("40", "60") })) // Esther is in SS 1
    expect(out).toMatchObject({ ok: false, code: "NOT_AUTHORIZED" })
    expect(await db.resultEntry.count()).toBe(0) // not even Daniel's valid row
    expect(await db.result.count()).toBe(0)
    const denied = await db.auditLog.findFirstOrThrow({ where: { action: "TEACHER_ACCESS_DENIED" } })
    expect(denied.metadata).toMatchObject({ attempt: "save", admission: "ZBHS/T/004" })
  })

  it("refuses unknown students such as ones invented by the browser", async () => {
    const w = await world()
    for (const admission of ["ZBHS/9/999", "", "../../etc", "' OR 1=1 --"]) {
      const out = await saveSubjectResults(w.maths.actor, req("jss-1", "MTH", "draft", { [admission]: row("1", "1") }))
      expect(out).toMatchObject({ ok: false, code: "NOT_AUTHORIZED" })
    }
    expect(await db.resultEntry.count()).toBe(0)
  })
})

// ---------------------------------------------------------------------------------------------------------
// Submit, and the rule that teachers cannot publish
// ---------------------------------------------------------------------------------------------------------

describe("submit result", () => {
  it("requires every student in the class to have complete scores, and submits nothing otherwise", async () => {
    const w = await world()
    const out = await saveSubjectResults(w.maths.actor, req("jss-1", "MTH", "submit", { "ZBHS/T/001": row("34", "52"), "ZBHS/T/002": row("20", "") }))
    expect(out.ok).toBe(false)
    if (out.ok) return
    expect(out.fieldErrors["ZBHS/T/002::Exam"]).toBe("Required to submit.")
    expect(await db.resultEntry.count()).toBe(0) // Daniel was not submitted either
  })

  it("a student left out of the form counts as missing (the teacher cannot submit a partial class)", async () => {
    const w = await world()
    const out = await saveSubjectResults(w.maths.actor, req("jss-1", "MTH", "submit", { "ZBHS/T/001": row("34", "52") }))
    expect(out.ok).toBe(false)
    if (out.ok) return
    expect(out.fieldErrors["ZBHS/T/002::CA"]).toBe("Required to submit.")
  })

  it("marks the entries SUBMITTED, keeps each student's result DRAFT while other subjects are missing, and logs it", async () => {
    const w = await world()
    const out = await saveSubjectResults(w.maths.actor, req("jss-1", "MTH", "submit", { "ZBHS/T/001": row("34", "52"), "ZBHS/T/002": row("20", "30") }))
    expect(out).toMatchObject({ ok: true, submittedEntries: 2, resultsReady: 0 })
    expect(out.ok && out.message).toContain("awaiting administrative publication")

    expect((await db.resultEntry.findMany()).map((e) => e.status)).toEqual(["SUBMITTED", "SUBMITTED"])
    expect((await db.result.findMany()).map((r) => r.status)).toEqual(["DRAFT", "DRAFT"]) // English not submitted yet
    expect(await auditActions(w.maths.user.id)).toContain("TEACHER_RESULT_SUBMITTED")
  })

  it("the student's result becomes SUBMITTED only when EVERY subject of the class is submitted, and never PUBLISHED", async () => {
    const w = await world()
    await saveSubjectResults(w.maths.actor, req("jss-1", "MTH", "submit", { "ZBHS/T/001": row("34", "52"), "ZBHS/T/002": row("20", "30") }))
    const second = await saveSubjectResults(w.english.actor, req("jss-1", "ENG", "submit", { "ZBHS/T/001": row("30", "45"), "ZBHS/T/002": row("25", "35") }))
    expect(second).toMatchObject({ ok: true, resultsReady: 2 })

    const results = await db.result.findMany()
    expect(results.map((r) => r.status)).toEqual(["SUBMITTED", "SUBMITTED"])
    for (const r of results) {
      expect(r.status).not.toBe("PUBLISHED")
      expect(r.publishedAt).toBeNull()
      expect(r.publishedById).toBeNull()
    }
    expect(await db.resultPublication.count()).toBe(0)
    expect((await auditActions(w.english.user.id)).filter((a) => a === "RESULT_READY_FOR_REVIEW")).toHaveLength(2)
  })

  it("locks submitted entries: the teacher can no longer change them", async () => {
    const w = await world()
    await saveSubjectResults(w.maths.actor, req("jss-1", "MTH", "submit", { "ZBHS/T/001": row("34", "52"), "ZBHS/T/002": row("20", "30") }))
    const before = (await db.resultEntry.findMany({ orderBy: { totalScore: "desc" } })).map((e) => e.totalScore?.toNumber())
    const out = await saveSubjectResults(w.maths.actor, req("jss-1", "MTH", "draft", { "ZBHS/T/001": row("40", "60") }))
    expect(out).toMatchObject({ ok: false, code: "LOCKED" })
    expect((await db.resultEntry.findMany({ orderBy: { totalScore: "desc" } })).map((e) => e.totalScore?.toNumber())).toEqual(before)
    const view = await loadWorkspace(w.maths.actor, { classKey: "jss-1", subjectCode: "MTH" })
    if (view.kind !== "READY") throw new Error("expected READY")
    expect(view.rows.every((r) => r.locked && r.status === "SUBMITTED")).toBe(true)
    expect(view.editableCount).toBe(0)
  })

  it("reports 'nothing left to submit' instead of re-submitting", async () => {
    const w = await world()
    await saveSubjectResults(w.maths.actor, req("jss-1", "MTH", "submit", { "ZBHS/T/001": row("34", "52"), "ZBHS/T/002": row("20", "30") }))
    expect(await saveSubjectResults(w.maths.actor, req("jss-1", "MTH", "submit", {}))).toMatchObject({ ok: false, code: "INVALID" })
  })

  it("a result that is already PUBLISHED can never be changed by a teacher", async () => {
    const w = await world()
    await saveSubjectResults(w.maths.actor, req("jss-1", "MTH", "draft", { "ZBHS/T/001": row("34", "52") }))
    await db.result.updateMany({ where: {}, data: { status: "PUBLISHED", publishedAt: NOW, publishedById: w.admin.id } })
    const out = await saveSubjectResults(w.maths.actor, req("jss-1", "MTH", "draft", { "ZBHS/T/001": row("0", "0") }))
    expect(out).toMatchObject({ ok: false, code: "LOCKED" })
    expect((await db.resultEntry.findFirstOrThrow()).totalScore?.toNumber()).toBe(86)
  })

  it("refuses to touch a result that was started under a different grading scheme", async () => {
    const w = await world()
    const other = await db.gradingScheme.create({ data: { name: "Old scheme" } })
    await db.result.create({ data: { studentId: w.daniel.id, sessionId: w.session.id, termId: w.term.id, classId: w.jss1.id, gradingSchemeId: other.id } })
    const out = await saveSubjectResults(w.maths.actor, req("jss-1", "MTH", "draft", { "ZBHS/T/001": row("30", "40") }))
    expect(out).toMatchObject({ ok: false, code: "LOCKED" })
    expect(await db.resultEntry.count()).toBe(0)
  })

  it("refuses to submit if the grading scheme has no band for the total", async () => {
    const w = await world()
    await db.gradeBand.deleteMany({ where: { grade: "A" } }) // total 86 now falls in a gap
    const out = await saveSubjectResults(w.maths.actor, req("jss-1", "MTH", "submit", { "ZBHS/T/001": row("34", "52"), "ZBHS/T/002": row("20", "30") }))
    expect(out.ok).toBe(false)
    if (out.ok) return
    expect(out.rowErrors["ZBHS/T/001"]).toContain("No grade band")
    expect(await db.resultEntry.count()).toBe(0)
  })
})

describe("teachers cannot publish", () => {
  it("the form has no publish intent: 'publish' (or anything else) is rejected before reaching the service", () => {
    for (const intent of ["publish", "PUBLISH", "published", "approve", "", "draft ", "submit;publish"]) {
      const form = new FormData()
      form.set("classKey", "jss-1"); form.set("subjectCode", "MTH"); form.set("intent", intent)
      expect(parseSaveForm(form).ok, `intent ${JSON.stringify(intent)}`).toBe(false)
    }
    for (const intent of ["draft", "submit"]) {
      const form = new FormData()
      form.set("classKey", "jss-1"); form.set("subjectCode", "MTH"); form.set("intent", intent)
      expect(parseSaveForm(form).ok).toBe(true)
    }
  })

  it("no teacher action, however it is combined, produces a PUBLISHED result or a publication record", async () => {
    const w = await world()
    for (const actor of [w.maths.actor, w.english.actor]) {
      for (const intent of ["draft", "submit"] as const) {
        await saveSubjectResults(actor, req("jss-1", actor === w.maths.actor ? "MTH" : "ENG", intent, { "ZBHS/T/001": row("34", "52"), "ZBHS/T/002": row("20", "30") }))
      }
    }
    expect((await db.result.findMany()).every((r) => r.status !== "PUBLISHED" && r.publishedAt === null)).toBe(true)
    expect(await db.resultPublication.count()).toBe(0)
  })

  it("the form parser rejects oversized or malformed cells", () => {
    const form = new FormData()
    form.set("classKey", "jss-1"); form.set("subjectCode", "MTH"); form.set("intent", "draft")
    form.set("score::ZBHS/T/001::CA", "9".repeat(50))
    expect(parseSaveForm(form).ok).toBe(false)
  })
})

// ---------------------------------------------------------------------------------------------------------
// Students must never see any of this
// ---------------------------------------------------------------------------------------------------------

describe("what students see while teachers work", () => {
  const SECRETS = ["34", "52", "86", "SECRET"]

  it("draft AND submitted AND fully-submitted results stay invisible to the student", async () => {
    const w = await world()
    const NOW_PLUS = NOW

    // stage 1: a teacher saves a draft
    await saveSubjectResults(w.maths.actor, req("jss-1", "MTH", "draft", { "ZBHS/T/001": row("34", "52") }))
    // stage 2: maths submitted
    await saveSubjectResults(w.maths.actor, req("jss-1", "MTH", "submit", { "ZBHS/T/001": row("34", "52"), "ZBHS/T/002": row("20", "30") }))
    // stage 3: English submitted too: the whole result is now SUBMITTED
    await saveSubjectResults(w.english.actor, req("jss-1", "ENG", "submit", { "ZBHS/T/001": row("30", "45"), "ZBHS/T/002": row("25", "35") }))
    expect((await db.result.findFirstOrThrow({ where: { studentId: w.daniel.id } })).status).toBe("SUBMITTED")

    const dashboard = await loadStudentDashboard(w.daniel.id, NOW_PLUS)
    expect(dashboard?.result.state).toBe("IN_PROGRESS")

    const view = await loadStudentResultView(w.daniel.id, undefined, NOW_PLUS)
    expect(view.kind).toBe("NOT_PUBLISHED")
    const text = JSON.stringify([dashboard, view])
    for (const s of SECRETS) expect(text.includes(`"${s}"`) || text.includes(`:${s},`) || text.includes(`:${s}}`), `leaked ${s}`).toBe(false)
    expect(text).not.toMatch(/totalScore|remark|"grade"|scores|entries|Mathematics|English/)
  })

  it("a partly entered result (one subject) is never shown, even after the teacher submitted their subject", async () => {
    const w = await world()
    await saveSubjectResults(w.maths.actor, req("jss-1", "MTH", "submit", { "ZBHS/T/001": row("34", "52"), "ZBHS/T/002": row("20", "30") }))
    const view = await loadStudentResultView(w.grace.id, undefined, NOW)
    expect(view.kind).toBe("NOT_PUBLISHED")
    expect(JSON.stringify(view)).not.toContain("Mathematics")
  })

  it("only an administrator action (here simulated in the database) makes the result visible", async () => {
    const w = await world()
    await saveSubjectResults(w.maths.actor, req("jss-1", "MTH", "submit", { "ZBHS/T/001": row("34", "52"), "ZBHS/T/002": row("20", "30") }))
    await saveSubjectResults(w.english.actor, req("jss-1", "ENG", "submit", { "ZBHS/T/001": row("30", "45"), "ZBHS/T/002": row("25", "35") }))
    expect((await loadStudentResultView(w.daniel.id, undefined, NOW)).kind).toBe("NOT_PUBLISHED")
    await db.result.updateMany({ where: { studentId: w.daniel.id }, data: { status: "PUBLISHED", publishedAt: new Date("2026-10-01"), publishedById: w.admin.id } })
    const view = await loadStudentResultView(w.daniel.id, undefined, NOW)
    expect(view.kind).toBe("PUBLISHED")
  })
})

// ---------------------------------------------------------------------------------------------------------
// Dashboard / My Classes numbers
// ---------------------------------------------------------------------------------------------------------

describe("teacher overview", () => {
  it("counts classes, subjects, pending and submitted from the teacher's own assignments", async () => {
    const w = await world()
    await saveSubjectResults(w.maths.actor, req("jss-1", "MTH", "submit", { "ZBHS/T/001": row("34", "52"), "ZBHS/T/002": row("20", "30") }))
    await saveSubjectResults(w.maths.actor, req("jss-2", "MTH", "draft", { "ZBHS/T/003": row("20", "") }))

    const o = await loadTeacherOverview(w.maths.teacher.id)
    expect(o.sessionName).toBe("2026/2027")
    expect(o.termName).toBe("FIRST")
    expect(o.totals).toEqual({ classes: 2, subjects: 1, pending: 1, submitted: 2 })
    expect(o.assignments.map((a) => [a.classKey, a.subjectCode, a.studentCount, a.submitted, a.drafts, a.notStarted, a.status])).toEqual([
      ["jss-1", "MTH", 2, 2, 0, 0, "SUBMITTED"],
      ["jss-2", "MTH", 1, 0, 1, 0, "IN_PROGRESS"],
    ])
  })

  it("does not count another teacher's work or another subject", async () => {
    const w = await world()
    await saveSubjectResults(w.english.actor, req("jss-1", "ENG", "submit", { "ZBHS/T/001": row("34", "52"), "ZBHS/T/002": row("20", "30") }))
    const o = await loadTeacherOverview(w.maths.teacher.id)
    expect(o.totals.submitted).toBe(0)
    expect(o.assignments.every((a) => a.submitted === 0 && a.status !== "SUBMITTED")).toBe(true)
  })

  it("shows 'no students' for a class with nobody enrolled, and 'not started' otherwise", async () => {
    const w = await world()
    await db.studentEnrollment.deleteMany({ where: { classId: w.jss2.id } })
    const o = await loadTeacherOverview(w.maths.teacher.id)
    expect(o.assignments.find((a) => a.classKey === "jss-2")?.status).toBe("NO_STUDENTS")
    expect(o.assignments.find((a) => a.classKey === "jss-1")?.status).toBe("NOT_STARTED")
  })

  it("counts a published result as submitted work", async () => {
    const w = await world()
    await saveSubjectResults(w.maths.actor, req("jss-1", "MTH", "submit", { "ZBHS/T/001": row("34", "52"), "ZBHS/T/002": row("20", "30") }))
    await db.result.updateMany({ where: { studentId: w.daniel.id }, data: { status: "PUBLISHED", publishedAt: NOW, publishedById: w.admin.id } })
    const o = await loadTeacherOverview(w.maths.teacher.id)
    const jss1 = o.assignments.find((a) => a.classKey === "jss-1")!
    expect([jss1.published, jss1.submitted, jss1.status]).toEqual([1, 1, "SUBMITTED"]) // one published, one still awaiting
  })
})
