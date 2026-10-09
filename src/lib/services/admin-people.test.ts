import { afterAll, beforeEach, describe, expect, it } from "vitest"

import { verifyPassword } from "@/lib/auth/password"
import { db } from "@/lib/db"
import { assignTeacher, createStudent, createTeacher, generatePassword } from "@/lib/services/admin-people"
import { assignmentSchema, parseForm, studentSchema } from "@/lib/validation/people"
import { resetDatabase } from "@/test/helpers"
import { world } from "@/test/world"

beforeEach(resetDatabase)
afterAll(() => db.$disconnect())

describe("adding people (admin)", () => {
  it("creates a student with an enrolment, a one-time password that only works as a hash, and a safe audit entry", async () => {
    const w = await world()
    const out = await createStudent({ userId: w.admin.id }, { admissionNumber: "ZBHS/N/001", firstName: "Ife", lastName: "Ola", classKey: "jss-1" })
    expect(out.ok).toBe(true)
    if (!out.ok || !out.credentials) throw new Error("expected credentials")

    const user = await db.user.findUniqueOrThrow({ where: { loginId: "ZBHS/N/001" }, include: { student: { include: { enrollments: true } } } })
    expect(user.role).toBe("STUDENT")
    expect(user.passwordHash).not.toContain(out.credentials.password)
    expect(await verifyPassword(user.passwordHash, out.credentials.password)).toBe(true)
    expect(user.student?.enrollments).toHaveLength(1)
    expect(user.student?.enrollments[0].classId).toBe(w.jss1.id)

    const log = await db.auditLog.findFirstOrThrow({ where: { action: "STUDENT_CREATED" } })
    expect(JSON.stringify(log.metadata)).not.toContain(out.credentials.password)
    expect(JSON.stringify(log.metadata)).not.toMatch(/hash|\$argon2/i)
  })

  it("refuses a duplicate admission number and an unknown class, and changes nothing", async () => {
    const w = await world()
    const dup = await createStudent({ userId: w.admin.id }, { admissionNumber: "ZBHS/T/001", firstName: "Ife", lastName: "Ola", classKey: "jss-1" })
    expect(dup).toMatchObject({ ok: false, fieldErrors: { admissionNumber: expect.any(String) } })
    const badClass = await createStudent({ userId: w.admin.id }, { admissionNumber: "ZBHS/N/002", firstName: "Ife", lastName: "Ola", classKey: "nope" })
    expect(badClass).toMatchObject({ ok: false, fieldErrors: { classKey: expect.any(String) } })
    expect(await db.user.count({ where: { loginId: "ZBHS/N/002" } })).toBe(0)
  })

  it("creates a teacher and assigns them a class and subject, adding the subject to the class if needed", async () => {
    const w = await world()
    const t = await createTeacher({ userId: w.admin.id }, { loginId: "teacher.new", employeeNumber: "T77", firstName: "Nia", lastName: "Bright", department: null })
    expect(t.ok).toBe(true)
    const a = await assignTeacher({ userId: w.admin.id }, { teacherLoginId: "teacher.new", classKey: "jss-2", subjectCode: "BIO" })
    expect(a.ok).toBe(true)
    const row = await db.teacherAssignment.findFirstOrThrow({ where: { teacher: { user: { loginId: "teacher.new" } } } })
    expect(row.classId).toBe(w.jss2.id)
    expect(await db.classSubject.count({ where: { classId: w.jss2.id, subjectId: w.bio.id, sessionId: w.session.id } })).toBe(1)
    expect(await assignTeacher({ userId: w.admin.id }, { teacherLoginId: "teacher.new", classKey: "jss-2", subjectCode: "BIO" })).toMatchObject({ ok: false })
  })

  it("is refused for a teacher or student acting as admin, and records the attempt", async () => {
    const w = await world()
    const out = await createStudent({ userId: w.maths.user.id }, { admissionNumber: "ZBHS/N/003", firstName: "A", lastName: "B", classKey: "jss-1" })
    expect(out).toMatchObject({ ok: false, message: "Only an administrator can do this." })
    expect(await db.user.count({ where: { loginId: "ZBHS/N/003" } })).toBe(0)
    expect(await db.auditLog.count({ where: { action: "ADMIN_ACCESS_DENIED" } })).toBe(1)
  })

  it("generates readable random passwords", () => {
    const a = generatePassword()
    expect(a).toHaveLength(14)
    expect(a).toMatch(/^[a-zA-Z2-9]+$/)
    expect(a).not.toMatch(/[0OlI1]/)
    expect(generatePassword()).not.toBe(a)
  })
})

describe("people form validation", () => {
  const form = (o: Record<string, string>) => {
    const f = new FormData()
    for (const [k, v] of Object.entries(o)) f.set(k, v)
    return f
  }
  it("accepts a good student and rejects bad names and ids with a message per field", () => {
    expect(parseForm(studentSchema, form({ admissionNumber: "ZBHS/2026/009", firstName: "Ada", lastName: "O'Neil", classKey: "jss-1" }), ["admissionNumber", "firstName", "lastName", "classKey"]).ok).toBe(true)
    const bad = parseForm(studentSchema, form({ admissionNumber: "x", firstName: "<b>", lastName: "", classKey: "" }), ["admissionNumber", "firstName", "lastName", "classKey"])
    expect(bad.ok).toBe(false)
    if (!bad.ok) expect(Object.keys(bad.fieldErrors).sort()).toEqual(["admissionNumber", "classKey", "firstName", "lastName"])
  })
  it("requires all assignment fields", () => {
    const bad = parseForm(assignmentSchema, form({}), ["teacherLoginId", "classKey", "subjectCode"])
    expect(bad.ok).toBe(false)
  })
})
