import "server-only"

import { randomInt } from "node:crypto"

import { classKey, classLabel } from "@/lib/academic"
import { hashPassword } from "@/lib/auth/password"
import { db } from "@/lib/db"
import { isActiveAdmin, recordAdminDenied } from "@/lib/services/admin-guard"
import type { AdminActor } from "@/lib/services/admin-results"

/**
 * Creating student and teacher accounts and assigning teachers (internal; reached only through admin-actions.ts after an
 * ADMIN session check, and every write re-confirms the actor is an active admin).
 *
 * The new account gets a random one-time password that is returned ONCE so the admin can hand it over. Only its Argon2id hash
 * is stored, and neither the password nor the hash is ever written to the audit log.
 */

export type PeopleOutcome =
  | { ok: true; message: string; credentials?: { loginId: string; password: string } }
  | { ok: false; message: string; fieldErrors?: Record<string, string> }

const NOT_ADMIN: PeopleOutcome = { ok: false, message: "Only an administrator can do this." }

// No look-alike characters (0/O, 1/l/I), so the password can be read out or copied by hand.
const ALPHABET = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789"
export function generatePassword(length = 14): string {
  let out = ""
  for (let i = 0; i < length; i++) out += ALPHABET[randomInt(ALPHABET.length)]
  return out
}

export type PersonOptions = {
  classes: { key: string; label: string }[]
  subjects: { code: string; name: string }[]
  teachers: { loginId: string; name: string }[]
}

export async function loadPersonOptions(): Promise<PersonOptions> {
  const [classes, subjects, teachers] = await Promise.all([
    db.schoolClass.findMany({ where: { isActive: true }, orderBy: [{ level: "asc" }, { name: "asc" }, { section: "asc" }], select: { name: true, section: true } }),
    db.subject.findMany({ where: { isActive: true }, orderBy: { name: "asc" }, select: { code: true, name: true } }),
    db.user.findMany({
      where: { role: "TEACHER", isActive: true, teacher: { isNot: null } },
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
      select: { loginId: true, firstName: true, lastName: true },
    }),
  ])
  return {
    classes: classes.map((c) => ({ key: classKey(c.name, c.section), label: classLabel(c.name, c.section) })),
    subjects,
    teachers: teachers.map((t) => ({ loginId: t.loginId, name: `${t.firstName} ${t.lastName}` })),
  }
}

async function findClass(key: string) {
  const classes = await db.schoolClass.findMany({ where: { isActive: true }, select: { id: true, name: true, section: true } })
  return classes.find((c) => classKey(c.name, c.section) === key) ?? null
}

export type NewStudent = { admissionNumber: string; firstName: string; lastName: string; classKey: string }

export async function createStudent(actor: AdminActor, input: NewStudent): Promise<PeopleOutcome> {
  if (!(await isActiveAdmin(actor.userId))) {
    await recordAdminDenied(actor.userId, "Student", "create")
    return NOT_ADMIN
  }
  const session = await db.academicSession.findFirst({ where: { isCurrent: true }, select: { id: true } })
  if (!session) return { ok: false, message: "There is no current academic session. Set one up first." }
  const klass = await findClass(input.classKey)
  if (!klass) return { ok: false, message: "Please correct the form.", fieldErrors: { classKey: "Choose one of the listed classes." } }

  const taken = await db.user.findUnique({ where: { loginId: input.admissionNumber }, select: { id: true } })
  if (taken) return { ok: false, message: "Please correct the form.", fieldErrors: { admissionNumber: "That admission number is already in use." } }

  const password = generatePassword()
  const passwordHash = await hashPassword(password)
  const created = await db.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: { loginId: input.admissionNumber, passwordHash, role: "STUDENT", firstName: input.firstName, lastName: input.lastName, isActive: true },
      select: { id: true },
    })
    const student = await tx.student.create({ data: { userId: user.id, admissionNumber: input.admissionNumber }, select: { id: true } })
    await tx.studentEnrollment.create({ data: { studentId: student.id, classId: klass.id, sessionId: session.id } })
    await tx.auditLog.create({
      data: {
        userId: actor.userId,
        action: "STUDENT_CREATED",
        entityType: "Student",
        entityId: student.id,
        metadata: { admissionNumber: input.admissionNumber, class: classLabel(klass.name, klass.section) },
      },
    })
    return student
  })
  void created
  return {
    ok: true,
    message: `Student ${input.firstName} ${input.lastName} was created.`,
    credentials: { loginId: input.admissionNumber, password },
  }
}

export type NewTeacher = { loginId: string; employeeNumber: string; firstName: string; lastName: string; department: string | null }

export async function createTeacher(actor: AdminActor, input: NewTeacher): Promise<PeopleOutcome> {
  if (!(await isActiveAdmin(actor.userId))) {
    await recordAdminDenied(actor.userId, "Teacher", "create")
    return NOT_ADMIN
  }
  const [loginTaken, numberTaken] = await Promise.all([
    db.user.findUnique({ where: { loginId: input.loginId }, select: { id: true } }),
    db.teacher.findUnique({ where: { employeeNumber: input.employeeNumber }, select: { id: true } }),
  ])
  const fieldErrors: Record<string, string> = {}
  if (loginTaken) fieldErrors.loginId = "That login ID is already in use."
  if (numberTaken) fieldErrors.employeeNumber = "That employee number is already in use."
  if (Object.keys(fieldErrors).length) return { ok: false, message: "Please correct the form.", fieldErrors }

  const password = generatePassword()
  const passwordHash = await hashPassword(password)
  await db.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: { loginId: input.loginId, passwordHash, role: "TEACHER", firstName: input.firstName, lastName: input.lastName, isActive: true },
      select: { id: true },
    })
    const teacher = await tx.teacher.create({
      data: { userId: user.id, employeeNumber: input.employeeNumber, department: input.department },
      select: { id: true },
    })
    await tx.auditLog.create({
      data: {
        userId: actor.userId,
        action: "TEACHER_CREATED",
        entityType: "Teacher",
        entityId: teacher.id,
        metadata: { loginId: input.loginId, employeeNumber: input.employeeNumber },
      },
    })
  })
  return {
    ok: true,
    message: `Teacher ${input.firstName} ${input.lastName} was created.`,
    credentials: { loginId: input.loginId, password },
  }
}

export type NewAssignment = { teacherLoginId: string; classKey: string; subjectCode: string }

/** Gives a teacher a class + subject for the current session. The class must offer the subject (it is added if missing). */
export async function assignTeacher(actor: AdminActor, input: NewAssignment): Promise<PeopleOutcome> {
  if (!(await isActiveAdmin(actor.userId))) {
    await recordAdminDenied(actor.userId, "TeacherAssignment", "create")
    return NOT_ADMIN
  }
  const session = await db.academicSession.findFirst({ where: { isCurrent: true }, select: { id: true } })
  if (!session) return { ok: false, message: "There is no current academic session. Set one up first." }

  const [teacher, klass, subject] = await Promise.all([
    db.teacher.findFirst({ where: { user: { loginId: input.teacherLoginId, isActive: true, role: "TEACHER" } }, select: { id: true } }),
    findClass(input.classKey),
    db.subject.findFirst({ where: { code: input.subjectCode, isActive: true }, select: { id: true, code: true } }),
  ])
  const fieldErrors: Record<string, string> = {}
  if (!teacher) fieldErrors.teacherLoginId = "Choose one of the listed teachers."
  if (!klass) fieldErrors.classKey = "Choose one of the listed classes."
  if (!subject) fieldErrors.subjectCode = "Choose one of the listed subjects."
  if (!teacher || !klass || !subject) return { ok: false, message: "Please correct the form.", fieldErrors }

  const where = { teacherId_classId_subjectId_sessionId: { teacherId: teacher.id, classId: klass.id, subjectId: subject.id, sessionId: session.id } }
  if (await db.teacherAssignment.findUnique({ where, select: { id: true } })) {
    return { ok: false, message: "That teacher already has this class and subject." }
  }

  await db.$transaction([
    db.classSubject.upsert({
      where: { classId_subjectId_sessionId: { classId: klass.id, subjectId: subject.id, sessionId: session.id } },
      create: { classId: klass.id, subjectId: subject.id, sessionId: session.id },
      update: {},
    }),
    db.teacherAssignment.create({ data: { teacherId: teacher.id, classId: klass.id, subjectId: subject.id, sessionId: session.id } }),
    db.auditLog.create({
      data: {
        userId: actor.userId,
        action: "TEACHER_ASSIGNED",
        entityType: "TeacherAssignment",
        entityId: teacher.id,
        metadata: { teacher: input.teacherLoginId, class: classLabel(klass.name, klass.section), subject: subject.code },
      },
    }),
  ])
  return { ok: true, message: "Assignment saved." }
}
