import { afterAll, beforeEach, describe, expect, it } from "vitest"

import { db } from "@/lib/db"
import { createSession, loadSessions, saveTerm, setCurrentSession, setCurrentTerm, updateSession } from "@/lib/services/admin-academics"
import { addSubjectToClass, createClass, createSubject, loadClassDetail, loadSubjectDetail, removeSubjectFromClass, updateClass, updateSubject } from "@/lib/services/admin-classes"
import { assignTeacher } from "@/lib/services/admin-people"
import {
  addBand, addComponent, createScheme, deleteBand, deleteComponent, loadGrading, setDefaultScheme, updateBand, updateComponent,
} from "@/lib/services/admin-grading"
import { classSchema, componentSchema, sessionCreateSchema, subjectSchema } from "@/lib/validation/structure"
import { resetDatabase } from "@/test/helpers"
import { world } from "@/test/world"

beforeEach(resetDatabase)
afterAll(() => db.$disconnect())

const NEXT = {
  name: "2027/2028", startDate: "2027-09-13", endDate: "2028-07-21", makeCurrent: false,
  firstStart: "2027-09-13", firstEnd: "2027-12-17", secondStart: "2028-01-10", secondEnd: "2028-04-07", thirdStart: "2028-04-24", thirdEnd: "2028-07-21",
}

describe("academic sessions and terms", () => {
  it("creates a session with three terms without disturbing the current session", async () => {
    const w = await world()
    expect(await createSession({ userId: w.admin.id }, NEXT)).toMatchObject({ ok: true })
    const sessions = await loadSessions()
    const created = sessions.find((s) => s.name === "2027/2028")
    expect(created?.isCurrent).toBe(false)
    expect(created?.terms.map((t) => t.name)).toEqual(["FIRST", "SECOND", "THIRD"])
    expect(sessions.find((s) => s.name === "2026/2027")?.isCurrent).toBe(true)
  })

  it("rejects bad names, inverted and overlapping dates, terms outside the session, and duplicate sessions", async () => {
    const w = await world()
    const admin = { userId: w.admin.id }
    expect(await createSession(admin, { ...NEXT, name: "2027/2029" })).toMatchObject({ ok: false, fieldErrors: { name: expect.any(String) } })
    expect(await createSession(admin, { ...NEXT, endDate: "2027-09-01" })).toMatchObject({ ok: false })
    expect(await createSession(admin, { ...NEXT, secondStart: "2027-12-01" })).toMatchObject({ ok: false, fieldErrors: { secondStart: expect.any(String) } })
    expect(await createSession(admin, { ...NEXT, thirdEnd: "2028-12-01" })).toMatchObject({ ok: false, fieldErrors: { thirdStart: expect.any(String) } })
    expect(await createSession(admin, { ...NEXT, name: "2026/2027", startDate: "2026-09-14" })).toMatchObject({ ok: false })
    // Overlaps the existing 2026/2027 session (14 Sep 2026 to 23 Jul 2027).
    expect(await createSession(admin, { ...NEXT, startDate: "2027-06-01", firstStart: "2027-06-01" })).toMatchObject({ ok: false, fieldErrors: { startDate: expect.stringContaining("overlap") } })
    expect(await db.academicSession.count()).toBe(2) // world(): past + current
  })

  it("setting a new current session leaves exactly one current session and term, and keeps history", async () => {
    const w = await world()
    const admin = { userId: w.admin.id }
    await createSession(admin, NEXT)
    expect(await setCurrentSession(admin, "2027-2028", new Date("2027-09-20"))).toMatchObject({ ok: true })
    expect(await db.academicSession.count({ where: { isCurrent: true } })).toBe(1)
    expect(await db.term.count({ where: { isCurrent: true } })).toBe(1)
    const current = await db.term.findFirstOrThrow({ where: { isCurrent: true }, include: { session: true } })
    expect(current.session.name).toBe("2027/2028")
    expect(current.name).toBe("FIRST")
    // Nothing was removed.
    expect(await db.term.count({ where: { sessionId: w.session.id } })).toBe(1)
    expect(await setCurrentSession(admin, "2027-2028")).toMatchObject({ ok: false })
  })

  it("the current term must belong to the current session and can be switched within it", async () => {
    const w = await world()
    const admin = { userId: w.admin.id }
    expect(await setCurrentTerm(admin, { sessionKey: "2026-2027", term: "SECOND" })).toMatchObject({ ok: false }) // not created yet
    expect(await saveTerm(admin, { sessionKey: "2026-2027", term: "SECOND", startDate: "2027-01-11", endDate: "2027-04-02" })).toMatchObject({ ok: true })
    expect(await setCurrentTerm(admin, { sessionKey: "2026-2027", term: "SECOND" })).toMatchObject({ ok: true })
    expect(await db.term.count({ where: { isCurrent: true } })).toBe(1)
    expect((await db.term.findFirstOrThrow({ where: { isCurrent: true } })).name).toBe("SECOND")
    expect(await setCurrentTerm(admin, { sessionKey: "2025-2026", term: "FIRST" })).toMatchObject({ ok: false }) // past session
  })

  it("keeps terms inside the session and prevents overlapping terms or session edits that strand a term", async () => {
    const w = await world()
    const admin = { userId: w.admin.id }
    await saveTerm(admin, { sessionKey: "2026-2027", term: "SECOND", startDate: "2027-01-11", endDate: "2027-04-02" })
    expect(await saveTerm(admin, { sessionKey: "2026-2027", term: "SECOND", startDate: "2026-12-01", endDate: "2027-04-02" })).toMatchObject({ ok: false, fieldErrors: { startDate: expect.stringContaining("overlap") } })
    expect(await saveTerm(admin, { sessionKey: "2026-2027", term: "THIRD", startDate: "2027-05-01", endDate: "2027-09-01" })).toMatchObject({ ok: false })
    expect(await updateSession(admin, { sessionKey: "2026-2027", startDate: "2026-10-01", endDate: "2027-07-23" })).toMatchObject({ ok: false }) // First Term starts 14 Sep
    expect(await updateSession(admin, { sessionKey: "2026-2027", startDate: "2026-09-01", endDate: "2027-07-30" })).toMatchObject({ ok: true })
    expect(await updateSession(admin, { sessionKey: "2026-2027", startDate: "2025-12-01", endDate: "2027-07-30" })).toMatchObject({ ok: false }) // overlaps 2025/2026
  })

  it("only an admin can change sessions", async () => {
    const w = await world()
    const actor = { userId: w.maths.user.id }
    expect(await createSession(actor, NEXT)).toMatchObject({ ok: false, message: "Only an administrator can do this." })
    expect(await setCurrentSession(actor, "2025-2026")).toMatchObject({ ok: false })
    expect((await db.academicSession.findFirstOrThrow({ where: { isCurrent: true } })).name).toBe("2026/2027")
  })

  it("validates the session form", () => {
    const base = { name: "2027/2028", startDate: "2027-09-13", endDate: "2028-07-21", firstStart: "2027-09-13", firstEnd: "2027-12-17", secondStart: "2028-01-10", secondEnd: "2028-04-07", thirdStart: "2028-04-24", thirdEnd: "2028-07-21", makeCurrent: "" }
    expect(sessionCreateSchema.safeParse(base).success).toBe(true)
    expect(sessionCreateSchema.safeParse({ ...base, name: "2027-2028" }).success).toBe(false)
    expect(sessionCreateSchema.safeParse({ ...base, startDate: "2027-02-30" }).success).toBe(false)
  })
})

describe("classes and subjects", () => {
  it("creates and edits a class, refusing duplicates", async () => {
    const w = await world()
    const admin = { userId: w.admin.id }
    expect(await createClass(admin, { name: "SS 2", level: 5, section: "" })).toMatchObject({ ok: true })
    expect(await createClass(admin, { name: "SS 2", level: 5, section: "" })).toMatchObject({ ok: false, fieldErrors: { name: expect.any(String) } })
    expect(await createClass(admin, { name: "SS 2", level: 5, section: "A" })).toMatchObject({ ok: true })
    expect(await updateClass(admin, { classKey: "ss-2-a", name: "SS 2", level: 5, section: "", isActive: true })).toMatchObject({ ok: false })
    expect(await updateClass(admin, { classKey: "ss-2-a", name: "SS 2", level: 5, section: "B", isActive: false })).toMatchObject({ ok: true })
    expect(await db.schoolClass.findFirstOrThrow({ where: { name: "SS 2", section: "B" } })).toMatchObject({ isActive: false, level: 5 })
  })

  it("creates a subject, edits it but never its code, and refuses duplicate codes", async () => {
    const w = await world()
    const admin = { userId: w.admin.id }
    expect(await createSubject(admin, { code: "CHM", name: "Chemistry", description: "" })).toMatchObject({ ok: true })
    expect(await createSubject(admin, { code: "CHM", name: "Other", description: "" })).toMatchObject({ ok: false, fieldErrors: { code: expect.any(String) } })
    expect(await updateSubject(admin, { code: "CHM", name: "Chemistry I", description: "Lab based", isActive: false })).toMatchObject({ ok: true })
    expect(await db.subject.findUniqueOrThrow({ where: { code: "CHM" } })).toMatchObject({ name: "Chemistry I", isActive: false, description: "Lab based" })
  })

  it("assigns subjects to classes and teachers to class subjects, once only, and shows them in the details", async () => {
    const w = await world()
    const admin = { userId: w.admin.id }
    expect(await addSubjectToClass(admin, { classKey: "jss-1", subjectCode: "BIO" })).toMatchObject({ ok: true })
    expect(await addSubjectToClass(admin, { classKey: "jss-1", subjectCode: "BIO" })).toMatchObject({ ok: false })
    expect(await addSubjectToClass(admin, { classKey: "nope", subjectCode: "BIO" })).toMatchObject({ ok: false })
    expect(await assignTeacher(admin, { teacherLoginId: "teacher.math", classKey: "jss-1", subjectCode: "BIO" })).toMatchObject({ ok: true })
    expect(await assignTeacher(admin, { teacherLoginId: "teacher.math", classKey: "jss-1", subjectCode: "BIO" })).toMatchObject({ ok: false })

    const klass = await loadClassDetail("jss-1")
    expect(klass?.students.map((s) => s.admissionNumber).sort()).toEqual(["ZBHS/T/001", "ZBHS/T/002"])
    expect(klass?.subjects.find((s) => s.code === "BIO")?.teachers.map((t) => t.loginId)).toEqual(["teacher.math"])
    const subject = await loadSubjectDetail("BIO")
    expect(subject?.classes.map((c) => c.key).sort()).toEqual(["jss-1", "ss-1"])
  })

  it("will not remove a subject from a class once results exist, but otherwise removes it and its assignments", async () => {
    const w = await world()
    const admin = { userId: w.admin.id }
    await addSubjectToClass(admin, { classKey: "jss-2", subjectCode: "BIO" })
    await assignTeacher(admin, { teacherLoginId: "teacher.math", classKey: "jss-2", subjectCode: "BIO" })
    expect(await removeSubjectFromClass(admin, { classKey: "jss-2", subjectCode: "BIO" })).toMatchObject({ ok: true })
    expect(await db.teacherAssignment.count({ where: { classId: w.jss2.id, subjectId: w.bio.id } })).toBe(0)

    const result = await db.result.create({ data: { studentId: w.daniel.id, sessionId: w.session.id, termId: w.term.id, classId: w.jss1.id, gradingSchemeId: w.scheme.id } })
    await db.resultEntry.create({ data: { resultId: result.id, subjectId: w.mth.id } })
    expect(await removeSubjectFromClass(admin, { classKey: "jss-1", subjectCode: "MTH" })).toMatchObject({ ok: false, message: expect.stringContaining("cannot be removed") })
    expect(await db.classSubject.count({ where: { classId: w.jss1.id, subjectId: w.mth.id } })).toBe(1)
  })

  it("only an admin can change classes and subjects", async () => {
    const w = await world()
    const actor = { userId: w.english.user.id }
    expect(await createClass(actor, { name: "SS 9", level: 9, section: "" })).toMatchObject({ ok: false })
    expect(await createSubject(actor, { code: "XYZ", name: "Nope", description: "" })).toMatchObject({ ok: false })
    expect(await addSubjectToClass(actor, { classKey: "jss-1", subjectCode: "BIO" })).toMatchObject({ ok: false })
    expect(await db.schoolClass.count({ where: { name: "SS 9" } })).toBe(0)
  })

  it("validates class and subject forms", () => {
    expect(classSchema.safeParse({ name: "SS 2", level: "5", section: "A" }).success).toBe(true)
    expect(classSchema.safeParse({ name: "", level: "x", section: "<b>" }).success).toBe(false)
    expect(subjectSchema.safeParse({ code: "mth", name: "Mathematics", description: "" })).toMatchObject({ success: true, data: { code: "MTH" } })
    expect(subjectSchema.safeParse({ code: "M", name: "Maths", description: "" }).success).toBe(false)
  })
})

describe("grading configuration", () => {
  const comp = (scheme: string, o: Partial<{ name: string; shortName: string; maxScore: number; weight: number; sortOrder: number }> = {}) => ({
    scheme, name: "Test 1", shortName: "T1", maxScore: 20, weight: 20, sortOrder: 0, ...o,
  })

  it("lists the scheme's components and bands from the database and reports weights", async () => {
    await world()
    const [scheme] = await loadGrading()
    expect(scheme).toMatchObject({ name: "Standard", isDefault: true, weightTotal: 100, locked: false, notReady: null })
    expect(scheme.components.map((c) => c.shortName)).toEqual(["CA", "Exam"])
  })

  it("builds a new scheme from scratch: components, bands, default only when complete", async () => {
    const w = await world()
    const admin = { userId: w.admin.id }
    expect(await createScheme(admin, { name: "Three part", description: "", copyFrom: "" })).toMatchObject({ ok: true })
    expect(await setDefaultScheme(admin, "Three part")).toMatchObject({ ok: false }) // no components yet

    expect(await addComponent(admin, comp("Three part", { name: "Test", shortName: "Test", maxScore: 20, weight: 20 }))).toMatchObject({ ok: true })
    expect(await addComponent(admin, comp("Three part", { name: "CA", shortName: "CA", maxScore: 20, weight: 20, sortOrder: 1 }))).toMatchObject({ ok: true })
    expect(await addComponent(admin, comp("Three part", { name: "Exam", shortName: "Exam", maxScore: 60, weight: 70, sortOrder: 2 }))).toMatchObject({ ok: false, fieldErrors: { weight: expect.any(String) } })
    expect(await addComponent(admin, comp("Three part", { name: "Exam", shortName: "Exam", maxScore: 60, weight: 60, sortOrder: 2 }))).toMatchObject({ ok: true })
    expect(await setDefaultScheme(admin, "Three part")).toMatchObject({ ok: false }) // no grade bands yet

    expect(await addBand(admin, { scheme: "Three part", grade: "A", minScore: 50, maxScore: 100, remark: "Pass", sortOrder: 1 })).toMatchObject({ ok: true })
    expect(await addBand(admin, { scheme: "Three part", grade: "F", minScore: 0, maxScore: 49.99, remark: "Fail", sortOrder: 2 })).toMatchObject({ ok: true })
    expect(await setDefaultScheme(admin, "Three part")).toMatchObject({ ok: true })
    expect(await db.gradingScheme.count({ where: { isDefault: true } })).toBe(1)
    expect((await db.gradingScheme.findFirstOrThrow({ where: { isDefault: true } })).name).toBe("Three part")
  })

  it("rejects duplicate components and overlapping or inverted bands", async () => {
    const w = await world()
    const admin = { userId: w.admin.id }
    await createScheme(admin, { name: "Work", description: "", copyFrom: "Standard" })
    expect(await addComponent(admin, comp("Work", { name: "Other", shortName: "CA", weight: 1 }))).toMatchObject({ ok: false, fieldErrors: { shortName: expect.any(String) } })
    expect(await addBand(admin, { scheme: "Work", grade: "A+", minScore: 65, maxScore: 80, remark: "x", sortOrder: 9 })).toMatchObject({ ok: false, fieldErrors: { minScore: expect.stringContaining("overlap") } })
    expect(await addBand(admin, { scheme: "Work", grade: "Z", minScore: 20, maxScore: 10, remark: "x", sortOrder: 9 })).toMatchObject({ ok: false, fieldErrors: { maxScore: expect.any(String) } })
    expect(await addBand(admin, { scheme: "Work", grade: "A", minScore: 0, maxScore: 1, remark: "x", sortOrder: 9 })).toMatchObject({ ok: false, fieldErrors: { grade: expect.any(String) } })
  })

  it("copies a scheme with its components and bands, and edits and deletes parts of an unused scheme", async () => {
    const w = await world()
    const admin = { userId: w.admin.id }
    expect(await createScheme(admin, { name: "Copy", description: "d", copyFrom: "Standard" })).toMatchObject({ ok: true })
    const copy = (await loadGrading()).find((s) => s.name === "Copy")
    expect(copy?.components).toHaveLength(2)
    expect(copy?.bands).toHaveLength(3)
    expect(copy?.isDefault).toBe(false)

    expect(await updateComponent(admin, { ...comp("Copy", { name: "Exam", shortName: "Exam", maxScore: 50, weight: 60, sortOrder: 2 }), current: "Exam" })).toMatchObject({ ok: true })
    expect((await loadGrading()).find((s) => s.name === "Copy")?.components.find((c) => c.shortName === "Exam")?.maxScore).toBe(50)
    expect(await updateBand(admin, { scheme: "Copy", current: "B", grade: "B", minScore: 60, maxScore: 69, remark: "Very Good", sortOrder: 2 })).toMatchObject({ ok: true })
    expect(await deleteBand(admin, { scheme: "Copy", grade: "F" })).toMatchObject({ ok: true })
    expect(await deleteComponent(admin, { scheme: "Copy", shortName: "CA" })).toMatchObject({ ok: true })
  })

  it("locks a scheme that results already use, so history never changes", async () => {
    const w = await world()
    const admin = { userId: w.admin.id }
    await db.result.create({ data: { studentId: w.daniel.id, sessionId: w.session.id, termId: w.term.id, classId: w.jss1.id, gradingSchemeId: w.scheme.id } })
    const [scheme] = await loadGrading()
    expect(scheme).toMatchObject({ locked: true, usedByResults: 1 })
    const locked = { ok: false, message: expect.stringContaining("locked") }
    expect(await addComponent(admin, comp("Standard"))).toMatchObject(locked)
    expect(await updateComponent(admin, { ...comp("Standard", { name: "Examination", shortName: "Exam" }), current: "Exam" })).toMatchObject(locked)
    expect(await deleteComponent(admin, { scheme: "Standard", shortName: "Exam" })).toMatchObject(locked)
    expect(await addBand(admin, { scheme: "Standard", grade: "G", minScore: 100.5, maxScore: 100.5, remark: "x", sortOrder: 9 })).toMatchObject(locked)
    expect(await deleteBand(admin, { scheme: "Standard", grade: "A" })).toMatchObject(locked)
    expect(await db.assessmentComponent.count()).toBe(2)
    expect(await db.gradeBand.count()).toBe(3)
  })

  it("only an admin can change grading", async () => {
    const w = await world()
    const actor = { userId: w.maths.user.id }
    expect(await createScheme(actor, { name: "Sneaky", description: "", copyFrom: "" })).toMatchObject({ ok: false })
    expect(await setDefaultScheme(actor, "Standard")).toMatchObject({ ok: false })
    expect(await db.gradingScheme.count()).toBe(1)
  })

  it("validates component forms", () => {
    const ok = { scheme: "S", name: "Exam", shortName: "Exam", maxScore: "60", weight: "60", sortOrder: "1" }
    expect(componentSchema.safeParse(ok).success).toBe(true)
    expect(componentSchema.safeParse({ ...ok, weight: "0" }).success).toBe(false)
    expect(componentSchema.safeParse({ ...ok, weight: "101" }).success).toBe(false)
    expect(componentSchema.safeParse({ ...ok, maxScore: "-5" }).success).toBe(false)
  })
})
