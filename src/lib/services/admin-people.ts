import "server-only"

import { randomInt } from "node:crypto"

import { classKey, classLabel, sessionKey } from "@/lib/academic"
import { hashPassword } from "@/lib/auth/password"
import { db } from "@/lib/db"
import { adminGate, isUniqueViolation } from "@/lib/services/admin-guard"
import type { AdminActor } from "@/lib/services/admin-results"
import type { Outcome } from "@/types/manage"

/**
 * Teacher and student accounts, enrolment, assignments, activation and password resets (internal; reached only through
 * admin-manage-actions.ts after an ADMIN session check, and every write re-confirms the actor is an active admin).
 *
 * A new or reset account gets a random one-time password returned ONCE so the admin can hand it over. Only its Argon2id hash
 * is stored, and neither the password nor the hash is ever written to the audit log. Linked records are created in one
 * transaction, so a failure never leaves a user without its teacher/student profile.
 */

export type PeopleOutcome = Outcome

// No look-alike characters (0/O, 1/l/I), so the password can be read out or copied by hand.
const ALPHABET = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789"
export function generatePassword(length = 14): string {
  let out = ""
  for (let i = 0; i < length; i++) out += ALPHABET[randomInt(ALPHABET.length)]
  return out
}

const BUSY: Outcome = { ok: false, message: "Someone else just saved a conflicting record. Please try again." }
const fail = (message: string, fieldErrors?: Record<string, string>): Outcome => ({ ok: false, message, fieldErrors })

// ---------------------------------------------------------------------------------------------------
// Options and lookups
// ---------------------------------------------------------------------------------------------------

export type PersonOptions = {
  classes: { key: string; label: string }[]
  subjects: { code: string; name: string }[]
  teachers: { loginId: string; name: string }[]
  sessions: { key: string; name: string; current: boolean }[]
}

export async function loadPersonOptions(): Promise<PersonOptions> {
  const [classes, subjects, teachers, sessions] = await Promise.all([
    db.schoolClass.findMany({ where: { isActive: true }, orderBy: [{ level: "asc" }, { name: "asc" }, { section: "asc" }], select: { name: true, section: true } }),
    db.subject.findMany({ where: { isActive: true }, orderBy: { name: "asc" }, select: { code: true, name: true } }),
    db.user.findMany({
      where: { role: "TEACHER", isActive: true, teacher: { isNot: null } },
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
      select: { loginId: true, firstName: true, lastName: true },
    }),
    db.academicSession.findMany({ orderBy: { startDate: "desc" }, select: { name: true, isCurrent: true } }),
  ])
  return {
    classes: classes.map((c) => ({ key: classKey(c.name, c.section), label: classLabel(c.name, c.section) })),
    subjects,
    teachers: teachers.map((t) => ({ loginId: t.loginId, name: `${t.firstName} ${t.lastName}` })),
    sessions: sessions.map((s) => ({ key: sessionKey(s.name), name: s.name, current: s.isCurrent })),
  }
}

async function findClass(key: string, activeOnly = true) {
  const classes = await db.schoolClass.findMany({
    where: activeOnly ? { isActive: true } : {},
    select: { id: true, name: true, section: true },
  })
  return classes.find((c) => classKey(c.name, c.section) === key) ?? null
}

async function findSession(key: string) {
  if (!key) return db.academicSession.findFirst({ where: { isCurrent: true }, select: { id: true, name: true, isCurrent: true } })
  const sessions = await db.academicSession.findMany({ select: { id: true, name: true, isCurrent: true } })
  return sessions.find((s) => sessionKey(s.name) === key) ?? null
}

// ---------------------------------------------------------------------------------------------------
// Generated identifiers
// ---------------------------------------------------------------------------------------------------

/** "TCH004": one more than the highest existing TCH number. */
export async function nextEmployeeNumber(): Promise<string> {
  const rows = await db.teacher.findMany({ where: { employeeNumber: { startsWith: "TCH" } }, select: { employeeNumber: true } })
  const max = rows.reduce((m, r) => Math.max(m, Number(/^TCH(\d+)$/.exec(r.employeeNumber)?.[1] ?? 0)), 0)
  return `TCH${String(max + 1).padStart(3, "0")}`
}

/** "ZBHS/2026/007": one more than the highest number for the year of the current session. */
export async function nextAdmissionNumber(): Promise<string> {
  const session = await db.academicSession.findFirst({ where: { isCurrent: true }, select: { startDate: true } })
  const year = (session?.startDate ?? new Date()).getUTCFullYear()
  const prefix = `ZBHS/${year}/`
  const rows = await db.student.findMany({ where: { admissionNumber: { startsWith: prefix } }, select: { admissionNumber: true } })
  const max = rows.reduce((m, r) => Math.max(m, Number(r.admissionNumber.slice(prefix.length)) || 0), 0)
  return `${prefix}${String(max + 1).padStart(3, "0")}`
}

/** "ada.obi", or "ada.obi2" when taken. */
async function uniqueLoginId(first: string, last: string): Promise<string> {
  const base = `${first}.${last}`.toLowerCase().normalize("NFD").replace(/[^a-z0-9.]+/g, "").slice(0, 30) || "teacher"
  for (let n = 1; n < 200; n++) {
    const candidate = n === 1 ? base : `${base}${n}`
    if (!(await db.user.findUnique({ where: { loginId: candidate }, select: { id: true } }))) return candidate
  }
  return `${base}${randomInt(1000, 9999)}`
}

// ---------------------------------------------------------------------------------------------------
// Create
// ---------------------------------------------------------------------------------------------------

export type NewStudent = { admissionNumber: string; firstName: string; lastName: string; classKey: string; email: string; phone: string }

export async function createStudent(actor: AdminActor, input: NewStudent): Promise<Outcome> {
  const denied = await adminGate(actor.userId, "Student", "create")
  if (denied) return denied
  const session = await db.academicSession.findFirst({ where: { isCurrent: true }, select: { id: true } })
  if (!session) return fail("There is no current academic session. Set one up first.")
  const klass = await findClass(input.classKey)
  if (!klass) return fail("Please correct the form.", { classKey: "Choose one of the listed classes." })

  const admissionNumber = input.admissionNumber || (await nextAdmissionNumber())
  if (await db.user.findUnique({ where: { loginId: admissionNumber }, select: { id: true } })) {
    return fail("Please correct the form.", { admissionNumber: "That admission number is already in use." })
  }

  const password = generatePassword()
  const passwordHash = await hashPassword(password)
  try {
    await db.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          loginId: admissionNumber, passwordHash, role: "STUDENT", firstName: input.firstName, lastName: input.lastName,
          email: input.email || null, phone: input.phone || null, isActive: true,
        },
        select: { id: true },
      })
      const student = await tx.student.create({ data: { userId: user.id, admissionNumber }, select: { id: true } })
      await tx.studentEnrollment.create({ data: { studentId: student.id, classId: klass.id, sessionId: session.id } })
      await tx.auditLog.create({
        data: { userId: actor.userId, action: "STUDENT_CREATED", entityType: "Student", entityId: student.id, metadata: { admissionNumber, class: classLabel(klass.name, klass.section) } },
      })
    })
  } catch (e) {
    if (isUniqueViolation(e)) return fail("Please correct the form.", { admissionNumber: "That admission number is already in use." })
    throw e
  }
  return { ok: true, message: `Student ${input.firstName} ${input.lastName} was created.`, credentials: { loginId: admissionNumber, password } }
}

export type NewTeacher = {
  loginId: string; employeeNumber: string; firstName: string; lastName: string
  department: string; qualification: string; email: string; phone: string
}

export async function createTeacher(actor: AdminActor, input: NewTeacher): Promise<Outcome> {
  const denied = await adminGate(actor.userId, "Teacher", "create")
  if (denied) return denied
  const loginId = input.loginId || (await uniqueLoginId(input.firstName, input.lastName))
  const employeeNumber = input.employeeNumber || (await nextEmployeeNumber())

  const [loginTaken, numberTaken] = await Promise.all([
    db.user.findUnique({ where: { loginId }, select: { id: true } }),
    db.teacher.findUnique({ where: { employeeNumber }, select: { id: true } }),
  ])
  const fieldErrors: Record<string, string> = {}
  if (loginTaken) fieldErrors.loginId = "That login ID is already in use."
  if (numberTaken) fieldErrors.employeeNumber = "That employee number is already in use."
  if (Object.keys(fieldErrors).length) return fail("Please correct the form.", fieldErrors)

  const password = generatePassword()
  const passwordHash = await hashPassword(password)
  try {
    await db.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          loginId, passwordHash, role: "TEACHER", firstName: input.firstName, lastName: input.lastName,
          email: input.email || null, phone: input.phone || null, isActive: true,
        },
        select: { id: true },
      })
      const teacher = await tx.teacher.create({
        data: { userId: user.id, employeeNumber, department: input.department || null, qualification: input.qualification || null },
        select: { id: true },
      })
      await tx.auditLog.create({
        data: { userId: actor.userId, action: "TEACHER_CREATED", entityType: "Teacher", entityId: teacher.id, metadata: { loginId, employeeNumber } },
      })
    })
  } catch (e) {
    if (isUniqueViolation(e)) return BUSY
    throw e
  }
  return { ok: true, message: `Teacher ${input.firstName} ${input.lastName} was created.`, credentials: { loginId, password } }
}

// ---------------------------------------------------------------------------------------------------
// Update
// ---------------------------------------------------------------------------------------------------

export type TeacherUpdate = { loginId: string; firstName: string; lastName: string; department: string; qualification: string; email: string; phone: string }

export async function updateTeacher(actor: AdminActor, input: TeacherUpdate): Promise<Outcome> {
  const denied = await adminGate(actor.userId, "Teacher", "update")
  if (denied) return denied
  const teacher = await db.teacher.findFirst({ where: { user: { loginId: input.loginId, role: "TEACHER" } }, select: { id: true, userId: true } })
  if (!teacher) return fail("That teacher no longer exists.")
  await db.$transaction([
    db.user.update({ where: { id: teacher.userId }, data: { firstName: input.firstName, lastName: input.lastName, email: input.email || null, phone: input.phone || null } }),
    db.teacher.update({ where: { id: teacher.id }, data: { department: input.department || null, qualification: input.qualification || null } }),
    db.auditLog.create({ data: { userId: actor.userId, action: "TEACHER_UPDATED", entityType: "Teacher", entityId: teacher.id, metadata: { loginId: input.loginId } } }),
  ])
  return { ok: true, message: "Teacher details saved." }
}

export type StudentUpdate = {
  admissionNumber: string; firstName: string; lastName: string; email: string; phone: string
  gender: "" | "MALE" | "FEMALE"; dateOfBirth: string; guardianName: string; guardianPhone: string; address: string
}

export async function updateStudent(actor: AdminActor, input: StudentUpdate): Promise<Outcome> {
  const denied = await adminGate(actor.userId, "Student", "update")
  if (denied) return denied
  const student = await db.student.findUnique({ where: { admissionNumber: input.admissionNumber }, select: { id: true, userId: true } })
  if (!student) return fail("That student no longer exists.")
  await db.$transaction([
    db.user.update({ where: { id: student.userId }, data: { firstName: input.firstName, lastName: input.lastName, email: input.email || null, phone: input.phone || null } }),
    db.student.update({
      where: { id: student.id },
      data: {
        gender: input.gender || null,
        dateOfBirth: input.dateOfBirth ? new Date(`${input.dateOfBirth}T00:00:00.000Z`) : null,
        guardianName: input.guardianName || null,
        guardianPhone: input.guardianPhone || null,
        address: input.address || null,
      },
    }),
    db.auditLog.create({ data: { userId: actor.userId, action: "STUDENT_UPDATED", entityType: "Student", entityId: student.id, metadata: { admissionNumber: input.admissionNumber } } }),
  ])
  return { ok: true, message: "Student details saved." }
}

// ---------------------------------------------------------------------------------------------------
// Activation, password reset
// ---------------------------------------------------------------------------------------------------

async function accountOf(kind: "teacher" | "student", key: string) {
  if (kind === "teacher") {
    const t = await db.teacher.findFirst({ where: { user: { loginId: key, role: "TEACHER" } }, select: { id: true, user: { select: { id: true, loginId: true, firstName: true, lastName: true } } } })
    return t ? { entityId: t.id, user: t.user, entity: "Teacher" as const } : null
  }
  const s = await db.student.findUnique({ where: { admissionNumber: key }, select: { id: true, user: { select: { id: true, loginId: true, firstName: true, lastName: true } } } })
  return s ? { entityId: s.id, user: s.user, entity: "Student" as const } : null
}

/** Activates or deactivates an account. Deactivating also signs the person out everywhere (their sessions are deleted). */
export async function setAccountActive(actor: AdminActor, kind: "teacher" | "student", key: string, active: boolean): Promise<Outcome> {
  const denied = await adminGate(actor.userId, kind === "teacher" ? "Teacher" : "Student", "set-active")
  if (denied) return denied
  const account = await accountOf(kind, key)
  if (!account) return fail("That account no longer exists.")
  await db.$transaction([
    db.user.update({ where: { id: account.user.id }, data: { isActive: active } }),
    ...(active ? [] : [db.session.deleteMany({ where: { userId: account.user.id } })]),
    db.auditLog.create({
      data: { userId: actor.userId, action: active ? `${account.entity.toUpperCase()}_ACTIVATED` : `${account.entity.toUpperCase()}_DEACTIVATED`, entityType: account.entity, entityId: account.entityId, metadata: { loginId: account.user.loginId } },
    }),
  ])
  return { ok: true, message: `${account.user.firstName} ${account.user.lastName}'s account is now ${active ? "active" : "inactive"}.` }
}

/** Sets a new random one-time password, returned once. Ends all of the person's sessions. */
export async function resetPassword(actor: AdminActor, kind: "teacher" | "student", key: string): Promise<Outcome> {
  const denied = await adminGate(actor.userId, kind === "teacher" ? "Teacher" : "Student", "reset-password")
  if (denied) return denied
  const account = await accountOf(kind, key)
  if (!account) return fail("That account no longer exists.")
  const password = generatePassword()
  const passwordHash = await hashPassword(password)
  await db.$transaction([
    db.user.update({ where: { id: account.user.id }, data: { passwordHash } }),
    db.session.deleteMany({ where: { userId: account.user.id } }),
    db.auditLog.create({ data: { userId: actor.userId, action: "PASSWORD_RESET", entityType: account.entity, entityId: account.entityId, metadata: { loginId: account.user.loginId } } }),
  ])
  return { ok: true, message: `A new password was set for ${account.user.firstName} ${account.user.lastName}.`, credentials: { loginId: account.user.loginId, password } }
}

// ---------------------------------------------------------------------------------------------------
// Enrolment
// ---------------------------------------------------------------------------------------------------

/**
 * Puts a student in a class for a session (the current session when `sessionKeyValue` is empty). A student has one class per
 * session: a second request for the same session MOVES them, unless they already have results in that session.
 */
export async function enrollStudent(actor: AdminActor, input: { admissionNumber: string; classKey: string; sessionKey: string }): Promise<Outcome> {
  const denied = await adminGate(actor.userId, "StudentEnrollment", "enroll")
  if (denied) return denied
  const [student, klass, session] = await Promise.all([
    db.student.findUnique({ where: { admissionNumber: input.admissionNumber }, select: { id: true } }),
    findClass(input.classKey),
    findSession(input.sessionKey),
  ])
  if (!student) return fail("That student no longer exists.")
  if (!klass) return fail("Please correct the form.", { classKey: "Choose one of the listed classes." })
  if (!session) return fail("Please correct the form.", { sessionKey: "Choose one of the listed sessions." })

  const existing = await db.studentEnrollment.findUnique({ where: { studentId_sessionId: { studentId: student.id, sessionId: session.id } }, select: { id: true, classId: true } })
  const label = classLabel(klass.name, klass.section)
  try {
    if (existing) {
      if (existing.classId === klass.id) return fail(`This student is already enrolled in ${label} for ${session.name}.`)
      if ((await db.result.count({ where: { studentId: student.id, sessionId: session.id } })) > 0) {
        return fail("This student already has results in that session, so they cannot be moved to another class.")
      }
      await db.$transaction([
        db.studentEnrollment.update({ where: { id: existing.id }, data: { classId: klass.id, isActive: true } }),
        db.auditLog.create({ data: { userId: actor.userId, action: "STUDENT_MOVED", entityType: "StudentEnrollment", entityId: existing.id, metadata: { admissionNumber: input.admissionNumber, class: label, session: session.name } } }),
      ])
      return { ok: true, message: `Moved to ${label} for ${session.name}.` }
    }
    const created = await db.studentEnrollment.create({ data: { studentId: student.id, classId: klass.id, sessionId: session.id }, select: { id: true } })
    await db.auditLog.create({ data: { userId: actor.userId, action: "STUDENT_ENROLLED", entityType: "StudentEnrollment", entityId: created.id, metadata: { admissionNumber: input.admissionNumber, class: label, session: session.name } } })
    return { ok: true, message: `Enrolled in ${label} for ${session.name}.` }
  } catch (e) {
    if (isUniqueViolation(e)) return fail("This student is already enrolled for that session.")
    throw e
  }
}

// ---------------------------------------------------------------------------------------------------
// Teacher assignments
// ---------------------------------------------------------------------------------------------------

export type NewAssignment = { teacherLoginId: string; classKey: string; subjectCode: string; sessionKey?: string }

/** Gives a teacher a class + subject for a session (default: current). The class must offer the subject (it is added if missing). */
export async function assignTeacher(actor: AdminActor, input: NewAssignment): Promise<Outcome> {
  const denied = await adminGate(actor.userId, "TeacherAssignment", "create")
  if (denied) return denied
  const session = await findSession(input.sessionKey ?? "")
  if (!session) return fail("There is no current academic session. Set one up first.")

  const [teacher, klass, subject] = await Promise.all([
    db.teacher.findFirst({ where: { user: { loginId: input.teacherLoginId, isActive: true, role: "TEACHER" } }, select: { id: true } }),
    findClass(input.classKey),
    db.subject.findFirst({ where: { code: input.subjectCode, isActive: true }, select: { id: true, code: true } }),
  ])
  const fieldErrors: Record<string, string> = {}
  if (!teacher) fieldErrors.teacherLoginId = "Choose one of the listed teachers."
  if (!klass) fieldErrors.classKey = "Choose one of the listed classes."
  if (!subject) fieldErrors.subjectCode = "Choose one of the listed subjects."
  if (!teacher || !klass || !subject) return fail("Please correct the form.", fieldErrors)

  const where = { teacherId_classId_subjectId_sessionId: { teacherId: teacher.id, classId: klass.id, subjectId: subject.id, sessionId: session.id } }
  if (await db.teacherAssignment.findUnique({ where, select: { id: true } })) return fail("That teacher already has this class and subject.")

  try {
    await db.$transaction([
      db.classSubject.upsert({
        where: { classId_subjectId_sessionId: { classId: klass.id, subjectId: subject.id, sessionId: session.id } },
        create: { classId: klass.id, subjectId: subject.id, sessionId: session.id },
        update: {},
      }),
      db.teacherAssignment.create({ data: { teacherId: teacher.id, classId: klass.id, subjectId: subject.id, sessionId: session.id } }),
      db.auditLog.create({
        data: { userId: actor.userId, action: "TEACHER_ASSIGNED", entityType: "TeacherAssignment", entityId: teacher.id, metadata: { teacher: input.teacherLoginId, class: classLabel(klass.name, klass.section), subject: subject.code, session: session.name } },
      }),
    ])
  } catch (e) {
    if (isUniqueViolation(e)) return fail("That teacher already has this class and subject.")
    throw e
  }
  return { ok: true, message: "Assignment saved." }
}

export async function removeAssignment(actor: AdminActor, input: { teacherLoginId: string; classKey: string; subjectCode: string; sessionKey: string }): Promise<Outcome> {
  const denied = await adminGate(actor.userId, "TeacherAssignment", "remove")
  if (denied) return denied
  const [teacher, klass, subject, session] = await Promise.all([
    db.teacher.findFirst({ where: { user: { loginId: input.teacherLoginId } }, select: { id: true } }),
    findClass(input.classKey, false),
    db.subject.findUnique({ where: { code: input.subjectCode }, select: { id: true, code: true } }),
    findSession(input.sessionKey),
  ])
  if (!teacher || !klass || !subject || !session) return fail("That assignment no longer exists.")
  const row = await db.teacherAssignment.findUnique({
    where: { teacherId_classId_subjectId_sessionId: { teacherId: teacher.id, classId: klass.id, subjectId: subject.id, sessionId: session.id } },
    select: { id: true },
  })
  if (!row) return fail("That assignment no longer exists.")
  await db.$transaction([
    db.teacherAssignment.delete({ where: { id: row.id } }),
    db.auditLog.create({
      data: { userId: actor.userId, action: "TEACHER_UNASSIGNED", entityType: "TeacherAssignment", entityId: teacher.id, metadata: { teacher: input.teacherLoginId, class: classLabel(klass.name, klass.section), subject: subject.code, session: session.name } },
    }),
  ])
  return { ok: true, message: "Assignment removed. Results already entered are kept." }
}

// ---------------------------------------------------------------------------------------------------
// Detail views
// ---------------------------------------------------------------------------------------------------

export type TeacherDetail = {
  loginId: string; employeeNumber: string; firstName: string; lastName: string
  department: string | null; qualification: string | null; email: string | null; phone: string | null
  active: boolean; createdAt: Date
  assignments: { sessionName: string; sessionCurrent: boolean; classKey: string; classLabel: string; subjectCode: string; subjectName: string }[]
}

export async function loadTeacherDetail(loginId: string): Promise<TeacherDetail | null> {
  const t = await db.teacher.findFirst({
    where: { user: { loginId, role: "TEACHER" } },
    select: {
      employeeNumber: true, department: true, qualification: true,
      user: { select: { loginId: true, firstName: true, lastName: true, email: true, phone: true, isActive: true, createdAt: true } },
      assignments: {
        select: { class: { select: { name: true, section: true, level: true } }, subject: { select: { code: true, name: true } }, session: { select: { name: true, isCurrent: true, startDate: true } } },
      },
    },
  })
  if (!t) return null
  const assignments = [...t.assignments]
    .sort((a, b) => b.session.startDate.getTime() - a.session.startDate.getTime() || a.class.level - b.class.level || a.subject.name.localeCompare(b.subject.name))
    .map((a) => ({
      sessionName: a.session.name, sessionCurrent: a.session.isCurrent,
      classKey: classKey(a.class.name, a.class.section), classLabel: classLabel(a.class.name, a.class.section),
      subjectCode: a.subject.code, subjectName: a.subject.name,
    }))
  return {
    loginId: t.user.loginId, employeeNumber: t.employeeNumber, firstName: t.user.firstName, lastName: t.user.lastName,
    department: t.department, qualification: t.qualification, email: t.user.email, phone: t.user.phone,
    active: t.user.isActive, createdAt: t.user.createdAt, assignments,
  }
}

export type StudentDetail = {
  admissionNumber: string; firstName: string; lastName: string; email: string | null; phone: string | null
  gender: "MALE" | "FEMALE" | null; dateOfBirth: Date | null; guardianName: string | null; guardianPhone: string | null; address: string | null
  active: boolean; createdAt: Date
  enrollments: { sessionName: string; sessionCurrent: boolean; classLabel: string; resultCount: number }[]
}

export async function loadStudentDetail(admissionNumber: string): Promise<StudentDetail | null> {
  const s = await db.student.findUnique({
    where: { admissionNumber },
    select: {
      id: true, admissionNumber: true, gender: true, dateOfBirth: true, guardianName: true, guardianPhone: true, address: true,
      user: { select: { firstName: true, lastName: true, email: true, phone: true, isActive: true, createdAt: true } },
      enrollments: { select: { sessionId: true, class: { select: { name: true, section: true } }, session: { select: { name: true, isCurrent: true, startDate: true } } } },
    },
  })
  if (!s) return null
  const counts = await db.result.groupBy({ by: ["sessionId"], where: { studentId: s.id }, _count: { _all: true } })
  const countBySession = new Map(counts.map((c) => [c.sessionId, c._count._all]))
  const enrollments = [...s.enrollments]
    .sort((a, b) => b.session.startDate.getTime() - a.session.startDate.getTime())
    .map((e) => ({ sessionName: e.session.name, sessionCurrent: e.session.isCurrent, classLabel: classLabel(e.class.name, e.class.section), resultCount: countBySession.get(e.sessionId) ?? 0 }))
  return {
    admissionNumber: s.admissionNumber, firstName: s.user.firstName, lastName: s.user.lastName, email: s.user.email, phone: s.user.phone,
    gender: s.gender, dateOfBirth: s.dateOfBirth, guardianName: s.guardianName, guardianPhone: s.guardianPhone, address: s.address,
    active: s.user.isActive, createdAt: s.user.createdAt, enrollments,
  }
}
