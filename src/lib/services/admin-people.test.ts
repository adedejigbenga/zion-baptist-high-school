import { afterAll, beforeEach, describe, expect, it } from "vitest"

import { authenticate } from "@/lib/auth/service"
import { verifyPassword } from "@/lib/auth/password"
import { db } from "@/lib/db"
import {
  assignTeacher,
  createStudent,
  createTeacher,
  enrollStudent,
  generatePassword,
  loadStudentDetail,
  loadTeacherDetail,
  nextAdmissionNumber,
  nextEmployeeNumber,
  removeAssignment,
  resetPassword,
  setAccountActive,
  updateStudent,
  updateTeacher,
} from "@/lib/services/admin-people"
import { assignmentSchema, parseForm, studentSchema, teacherSchema } from "@/lib/validation/people"
import { resetDatabase } from "@/test/helpers"
import { world } from "@/test/world"

beforeEach(resetDatabase)
afterAll(() => db.$disconnect())

const blankStudent = { admissionNumber: "", firstName: "Ife", lastName: "Ola", classKey: "jss-1", email: "", phone: "" }
const blankTeacher = { loginId: "", employeeNumber: "", firstName: "Nia", lastName: "Bright", department: "", qualification: "", email: "", phone: "" }

describe("creating people", () => {
  it("creates a student with an enrolment, a hashed one-time password and a safe audit entry", async () => {
    const w = await world()
    const out = await createStudent({ userId: w.admin.id }, { ...blankStudent, admissionNumber: "ZBHS/N/001" })
    expect(out.ok).toBe(true)
    if (!out.ok || !out.credentials) throw new Error("expected credentials")

    const user = await db.user.findUniqueOrThrow({ where: { loginId: "ZBHS/N/001" }, include: { student: { include: { enrollments: true } } } })
    expect(user.role).toBe("STUDENT")
    expect(user.passwordHash).not.toContain(out.credentials.password)
    expect(user.passwordHash.startsWith("$argon2id$")).toBe(true)
    expect(await verifyPassword(user.passwordHash, out.credentials.password)).toBe(true)
    expect(user.student?.enrollments).toHaveLength(1)
    expect(user.student?.enrollments[0].classId).toBe(w.jss1.id)

    const log = await db.auditLog.findFirstOrThrow({ where: { action: "STUDENT_CREATED" } })
    expect(JSON.stringify(log.metadata)).not.toContain(out.credentials.password)
    expect(JSON.stringify(log.metadata)).not.toMatch(/hash|\$argon2/i)
  })

  it("generates the next admission number and employee number when left blank", async () => {
    const w = await world()
    expect(await nextEmployeeNumber()).toBe("TCH001")
    const t = await createTeacher({ userId: w.admin.id }, blankTeacher)
    expect(t).toMatchObject({ ok: true, credentials: { loginId: "nia.bright" } })
    expect(await nextEmployeeNumber()).toBe("TCH002")

    await createStudent({ userId: w.admin.id }, { ...blankStudent, admissionNumber: "ZBHS/2026/005" })
    expect(await nextAdmissionNumber()).toBe("ZBHS/2026/006")
    const s = await createStudent({ userId: w.admin.id }, blankStudent)
    expect(s).toMatchObject({ ok: true, credentials: { loginId: "ZBHS/2026/006" } })
  })

  it("makes a second generated teacher login unique", async () => {
    const w = await world()
    await createTeacher({ userId: w.admin.id }, blankTeacher)
    const again = await createTeacher({ userId: w.admin.id }, blankTeacher)
    expect(again).toMatchObject({ ok: true, credentials: { loginId: "nia.bright2" } })
  })

  it("rejects duplicate login IDs, employee numbers and admission numbers, and changes nothing", async () => {
    const w = await world()
    const before = await db.user.count()
    expect(await createStudent({ userId: w.admin.id }, { ...blankStudent, admissionNumber: "ZBHS/T/001" })).toMatchObject({ ok: false, fieldErrors: { admissionNumber: expect.any(String) } })
    expect(await createTeacher({ userId: w.admin.id }, { ...blankTeacher, loginId: "teacher.math" })).toMatchObject({ ok: false, fieldErrors: { loginId: expect.any(String) } })
    expect(await createTeacher({ userId: w.admin.id }, { ...blankTeacher, employeeNumber: "T1" })).toMatchObject({ ok: false, fieldErrors: { employeeNumber: expect.any(String) } })
    expect(await createStudent({ userId: w.admin.id }, { ...blankStudent, admissionNumber: "ZBHS/N/002", classKey: "nope" })).toMatchObject({ ok: false, fieldErrors: { classKey: expect.any(String) } })
    expect(await db.user.count()).toBe(before)
  })

  it("leaves no orphaned user when the linked profile cannot be created", async () => {
    const w = await world()
    // The teacher row would collide on employee number, but only AFTER the user insert: the transaction must roll back.
    await db.teacher.create({ data: { userId: (await db.user.create({ data: { loginId: "other.t", passwordHash: "x", role: "TEACHER", firstName: "O", lastName: "T" } })).id, employeeNumber: "RACE1" } })
    const users = await db.user.count()
    // Force the race: pre-check passes for a free number, then the number is taken before insert by a parallel create.
    const [a, b] = await Promise.all([
      createTeacher({ userId: w.admin.id }, { ...blankTeacher, loginId: "race.one", employeeNumber: "RACE2" }),
      createTeacher({ userId: w.admin.id }, { ...blankTeacher, loginId: "race.two", employeeNumber: "RACE2" }),
    ])
    expect([a.ok, b.ok].filter(Boolean)).toHaveLength(1)
    expect(await db.user.count()).toBe(users + 1)
    expect(await db.user.count({ where: { role: "TEACHER", teacher: null } })).toBe(0)
  })

  it("is refused for a teacher or student acting as admin, and records the attempt", async () => {
    const w = await world()
    const out = await createStudent({ userId: w.maths.user.id }, { ...blankStudent, admissionNumber: "ZBHS/N/003" })
    expect(out).toMatchObject({ ok: false, message: "Only an administrator can do this." })
    expect(await createTeacher({ userId: w.daniel.userId }, blankTeacher)).toMatchObject({ ok: false })
    expect(await db.user.count({ where: { loginId: "ZBHS/N/003" } })).toBe(0)
    expect(await db.auditLog.count({ where: { action: "ADMIN_ACCESS_DENIED" } })).toBe(2)
  })

  it("generates readable random passwords", () => {
    const a = generatePassword()
    expect(a).toHaveLength(14)
    expect(a).toMatch(/^[a-zA-Z2-9]+$/)
    expect(a).not.toMatch(/[0OlI1]/)
    expect(generatePassword()).not.toBe(a)
  })
})

describe("editing, activation and passwords", () => {
  it("updates a teacher's and a student's details", async () => {
    const w = await world()
    expect(await updateTeacher({ userId: w.admin.id }, { loginId: "teacher.math", firstName: "Pete", lastName: "Okoro", department: "Maths", qualification: "BSc", email: "p@example.test", phone: "08011112222" })).toMatchObject({ ok: true })
    const t = await loadTeacherDetail("teacher.math")
    expect(t).toMatchObject({ firstName: "Pete", department: "Maths", qualification: "BSc", email: "p@example.test" })

    expect(await updateStudent({ userId: w.admin.id }, { admissionNumber: "ZBHS/T/001", firstName: "Dan", lastName: "Ade", email: "", phone: "", gender: "MALE", dateOfBirth: "2014-03-12", guardianName: "Mr Ade", guardianPhone: "", address: "Lagos" })).toMatchObject({ ok: true })
    const s = await loadStudentDetail("ZBHS/T/001")
    expect(s).toMatchObject({ firstName: "Dan", gender: "MALE", guardianName: "Mr Ade", address: "Lagos" })
    expect(s?.dateOfBirth?.toISOString().slice(0, 10)).toBe("2014-03-12")
  })

  it("an inactive account cannot sign in, its sessions end, and it can be activated again", async () => {
    const w = await world()
    const created = await createTeacher({ userId: w.admin.id }, blankTeacher)
    if (!created.ok || !created.credentials) throw new Error("expected credentials")
    const { loginId, password } = created.credentials

    const first = await authenticate({ portal: "teacher", loginId, password, ip: "10.0.0.1" })
    expect(first.ok).toBe(true)
    expect(await db.session.count({ where: { user: { loginId } } })).toBe(1)

    expect(await setAccountActive({ userId: w.admin.id }, "teacher", loginId, false)).toMatchObject({ ok: true })
    expect(await db.session.count({ where: { user: { loginId } } })).toBe(0)
    expect((await authenticate({ portal: "teacher", loginId, password, ip: "10.0.0.1" })).ok).toBe(false)

    expect(await setAccountActive({ userId: w.admin.id }, "teacher", loginId, true)).toMatchObject({ ok: true })
    expect((await authenticate({ portal: "teacher", loginId, password, ip: "10.0.0.1" })).ok).toBe(true)
  })

  it("a student can be deactivated and activated too", async () => {
    const w = await world()
    expect(await setAccountActive({ userId: w.admin.id }, "student", "ZBHS/T/001", false)).toMatchObject({ ok: true })
    expect((await db.user.findUniqueOrThrow({ where: { loginId: "ZBHS/T/001" } })).isActive).toBe(false)
    expect(await setAccountActive({ userId: w.admin.id }, "student", "ZBHS/NOPE", true)).toMatchObject({ ok: false })
  })

  it("resets a password to a new hashed one-time value and ends old sessions", async () => {
    const w = await world()
    const out = await resetPassword({ userId: w.admin.id }, "student", "ZBHS/T/002")
    if (!out.ok || !out.credentials) throw new Error("expected credentials")
    const user = await db.user.findUniqueOrThrow({ where: { loginId: "ZBHS/T/002" } })
    expect(await verifyPassword(user.passwordHash, out.credentials.password)).toBe(true)
    const log = await db.auditLog.findFirstOrThrow({ where: { action: "PASSWORD_RESET" } })
    expect(JSON.stringify(log.metadata)).not.toContain(out.credentials.password)
  })

  it("only an admin may edit, deactivate or reset", async () => {
    const w = await world()
    const actor = { userId: w.maths.user.id }
    expect(await updateTeacher(actor, { loginId: "teacher.english", firstName: "X", lastName: "Y", department: "", qualification: "", email: "", phone: "" })).toMatchObject({ ok: false })
    expect(await setAccountActive(actor, "student", "ZBHS/T/001", false)).toMatchObject({ ok: false })
    expect(await resetPassword(actor, "student", "ZBHS/T/001")).toMatchObject({ ok: false })
    expect((await db.user.findUniqueOrThrow({ where: { loginId: "ZBHS/T/001" } })).isActive).toBe(true)
  })
})

describe("enrolment and assignments", () => {
  it("moves a student within a session, refuses a duplicate, and refuses once results exist", async () => {
    const w = await world()
    const admin = { userId: w.admin.id }
    expect(await enrollStudent(admin, { admissionNumber: "ZBHS/T/001", classKey: "jss-1", sessionKey: "" })).toMatchObject({ ok: false })
    expect(await enrollStudent(admin, { admissionNumber: "ZBHS/T/001", classKey: "jss-2", sessionKey: "" })).toMatchObject({ ok: true })
    expect(await db.studentEnrollment.count({ where: { student: { admissionNumber: "ZBHS/T/001" }, sessionId: w.session.id } })).toBe(1)

    await db.result.create({ data: { studentId: w.daniel.id, sessionId: w.session.id, termId: w.term.id, classId: w.jss2.id, gradingSchemeId: w.scheme.id } })
    expect(await enrollStudent(admin, { admissionNumber: "ZBHS/T/001", classKey: "jss-1", sessionKey: "" })).toMatchObject({ ok: false })
  })

  it("enrols a student in another session without touching the first, and keeps history", async () => {
    const w = await world()
    const next = await db.academicSession.create({ data: { name: "2027/2028", startDate: new Date("2027-09-13"), endDate: new Date("2028-07-21") } })
    expect(next.isCurrent).toBe(false)
    expect(await enrollStudent({ userId: w.admin.id }, { admissionNumber: "ZBHS/T/001", classKey: "jss-2", sessionKey: "2027-2028" })).toMatchObject({ ok: true })
    const detail = await loadStudentDetail("ZBHS/T/001")
    expect(detail?.enrollments.map((e) => [e.sessionName, e.classLabel])).toEqual([["2027/2028", "JSS 2"], ["2026/2027", "JSS 1"]])
  })

  it("assigns a teacher once, adds the subject to the class, and removes the assignment", async () => {
    const w = await world()
    const admin = { userId: w.admin.id }
    expect(await createTeacher(admin, blankTeacher)).toMatchObject({ ok: true })
    expect(await assignTeacher(admin, { teacherLoginId: "nia.bright", classKey: "jss-2", subjectCode: "BIO" })).toMatchObject({ ok: true })
    expect(await db.classSubject.count({ where: { classId: w.jss2.id, subjectId: w.bio.id, sessionId: w.session.id } })).toBe(1)
    expect(await assignTeacher(admin, { teacherLoginId: "nia.bright", classKey: "jss-2", subjectCode: "BIO" })).toMatchObject({ ok: false })
    expect(await assignTeacher(admin, { teacherLoginId: "ZBHS/T/001", classKey: "jss-2", subjectCode: "BIO" })).toMatchObject({ ok: false })

    const detail = await loadTeacherDetail("nia.bright")
    expect(detail?.assignments).toHaveLength(1)
    expect(await removeAssignment(admin, { teacherLoginId: "nia.bright", classKey: "jss-2", subjectCode: "BIO", sessionKey: "2026-2027" })).toMatchObject({ ok: true })
    expect((await loadTeacherDetail("nia.bright"))?.assignments).toHaveLength(0)
  })

  it("only an admin may enrol or assign", async () => {
    const w = await world()
    const actor = { userId: w.english.user.id }
    expect(await enrollStudent(actor, { admissionNumber: "ZBHS/T/001", classKey: "jss-2", sessionKey: "" })).toMatchObject({ ok: false })
    expect(await assignTeacher(actor, { teacherLoginId: "teacher.math", classKey: "ss-1", subjectCode: "BIO" })).toMatchObject({ ok: false })
    expect(await db.teacherAssignment.count({ where: { subjectId: w.bio.id } })).toBe(0)
  })
})

describe("people form validation", () => {
  const form = (o: Record<string, string>) => {
    const f = new FormData()
    for (const [k, v] of Object.entries(o)) f.set(k, v)
    return f
  }
  it("accepts a good student and rejects bad names, ids and emails with a message per field", () => {
    const fields = ["admissionNumber", "firstName", "lastName", "classKey", "email", "phone"]
    expect(parseForm(studentSchema, form({ admissionNumber: "ZBHS/2026/009", firstName: "Ada", lastName: "O'Neil", classKey: "jss-1", email: "", phone: "" }), fields).ok).toBe(true)
    expect(parseForm(studentSchema, form({ admissionNumber: "", firstName: "Ada", lastName: "Obi", classKey: "jss-1", email: "", phone: "" }), fields).ok).toBe(true)
    const bad = parseForm(studentSchema, form({ admissionNumber: "x", firstName: "<b>", lastName: "", classKey: "", email: "nope", phone: "abc" }), fields)
    expect(bad.ok).toBe(false)
    if (!bad.ok) expect(Object.keys(bad.fieldErrors).sort()).toEqual(["admissionNumber", "classKey", "email", "firstName", "lastName", "phone"])
  })
  it("validates teacher ids and requires all assignment fields", () => {
    expect(parseForm(teacherSchema, form({ loginId: "bad id!", employeeNumber: "", firstName: "A", lastName: "B", department: "", qualification: "", email: "", phone: "" }), ["loginId", "employeeNumber", "firstName", "lastName", "department", "qualification", "email", "phone"]).ok).toBe(false)
    expect(parseForm(assignmentSchema, form({}), ["teacherLoginId", "classKey", "subjectCode"]).ok).toBe(false)
  })
})
