import "server-only"

import { classKey, classLabel } from "@/lib/academic"
import { db } from "@/lib/db"
import { adminGate, isUniqueViolation } from "@/lib/services/admin-guard"
import type { AdminActor } from "@/lib/services/admin-results"
import type { Outcome } from "@/types/manage"

/**
 * Classes, subjects and which subjects each class offers (internal; reached only through admin-manage-actions after an ADMIN
 * session check; every write re-confirms the actor is an active admin). Teachers are attached to class subjects with
 * assignTeacher in admin-people.ts, so there is one rule for that.
 *
 * Nothing here deletes a class or a subject: they are deactivated, so enrolments and results keep their meaning. A subject
 * can only be removed from a class while no result entry exists for it.
 */

const fail = (message: string, fieldErrors?: Record<string, string>): Outcome => ({ ok: false, message, fieldErrors })

async function currentSession() {
  return db.academicSession.findFirst({ where: { isCurrent: true }, select: { id: true, name: true } })
}

async function findClass(key: string) {
  const classes = await db.schoolClass.findMany({ select: { id: true, name: true, section: true, level: true, isActive: true } })
  return classes.find((c) => classKey(c.name, c.section) === key) ?? null
}

// ---------------------------------------------------------------------------------------------------
// Classes
// ---------------------------------------------------------------------------------------------------

export type ClassListRow = {
  key: string; label: string; name: string; section: string | null; level: number; active: boolean
  students: number; subjects: number; teachers: number
}

export async function loadClassList(): Promise<{ sessionName: string | null; rows: ClassListRow[] }> {
  const session = await currentSession()
  const sid = session?.id ?? "none"
  const classes = await db.schoolClass.findMany({
    orderBy: [{ level: "asc" }, { name: "asc" }, { section: "asc" }],
    select: {
      id: true, name: true, section: true, level: true, isActive: true,
      _count: { select: { enrollments: { where: { sessionId: sid, isActive: true } }, classSubjects: { where: { sessionId: sid } } } },
      teacherAssignments: { where: { sessionId: sid }, select: { teacherId: true } },
    },
  })
  return {
    sessionName: session?.name ?? null,
    rows: classes.map((c) => ({
      key: classKey(c.name, c.section), label: classLabel(c.name, c.section), name: c.name, section: c.section, level: c.level, active: c.isActive,
      students: c._count.enrollments, subjects: c._count.classSubjects, teachers: new Set(c.teacherAssignments.map((t) => t.teacherId)).size,
    })),
  }
}

export type ClassDetail = {
  key: string; label: string; name: string; section: string | null; level: number; active: boolean
  sessionName: string | null
  students: { name: string; admissionNumber: string; active: boolean }[]
  subjects: { code: string; name: string; teachers: { loginId: string; name: string }[] }[]
}

export async function loadClassDetail(key: string): Promise<ClassDetail | null> {
  const klass = await findClass(key)
  if (!klass) return null
  const session = await currentSession()
  const sid = session?.id ?? "none"
  const [enrollments, classSubjects, assignments] = await Promise.all([
    db.studentEnrollment.findMany({
      where: { classId: klass.id, sessionId: sid, isActive: true },
      select: { student: { select: { admissionNumber: true, user: { select: { firstName: true, lastName: true, isActive: true } } } } },
    }),
    db.classSubject.findMany({ where: { classId: klass.id, sessionId: sid }, select: { subject: { select: { code: true, name: true } } } }),
    db.teacherAssignment.findMany({
      where: { classId: klass.id, sessionId: sid },
      select: { subject: { select: { code: true } }, teacher: { select: { user: { select: { loginId: true, firstName: true, lastName: true } } } } },
    }),
  ])
  return {
    key: classKey(klass.name, klass.section), label: classLabel(klass.name, klass.section), name: klass.name, section: klass.section, level: klass.level, active: klass.isActive,
    sessionName: session?.name ?? null,
    students: enrollments
      .map((e) => ({ name: `${e.student.user.firstName} ${e.student.user.lastName}`, admissionNumber: e.student.admissionNumber, active: e.student.user.isActive }))
      .sort((a, b) => a.name.localeCompare(b.name)),
    subjects: classSubjects
      .map((cs) => ({
        code: cs.subject.code, name: cs.subject.name,
        teachers: assignments.filter((a) => a.subject.code === cs.subject.code).map((a) => ({ loginId: a.teacher.user.loginId, name: `${a.teacher.user.firstName} ${a.teacher.user.lastName}` })),
      }))
      .sort((a, b) => a.name.localeCompare(b.name)),
  }
}

export type ClassInput = { name: string; level: number; section: string }

export async function createClass(actor: AdminActor, input: ClassInput): Promise<Outcome> {
  const denied = await adminGate(actor.userId, "SchoolClass", "create")
  if (denied) return denied
  const section = input.section || null
  const taken = await db.schoolClass.findFirst({ where: { name: input.name, section }, select: { id: true } })
  if (taken) return fail("Please correct the form.", { name: "A class with this name and section already exists." })
  try {
    const created = await db.schoolClass.create({ data: { name: input.name, level: input.level, section, isActive: true }, select: { id: true } })
    await db.auditLog.create({ data: { userId: actor.userId, action: "CLASS_CREATED", entityType: "SchoolClass", entityId: created.id, metadata: { class: classLabel(input.name, section), level: input.level } } })
  } catch (e) {
    if (isUniqueViolation(e)) return fail("Please correct the form.", { name: "A class with this name and section already exists." })
    throw e
  }
  return { ok: true, message: `Class ${classLabel(input.name, section)} was created.` }
}

export async function updateClass(actor: AdminActor, input: ClassInput & { classKey: string; isActive: boolean }): Promise<Outcome> {
  const denied = await adminGate(actor.userId, "SchoolClass", "update")
  if (denied) return denied
  const klass = await findClass(input.classKey)
  if (!klass) return fail("That class no longer exists.")
  const section = input.section || null
  const clash = await db.schoolClass.findFirst({ where: { name: input.name, section, id: { not: klass.id } }, select: { id: true } })
  if (clash) return fail("Please correct the form.", { name: "Another class already has this name and section." })
  try {
    await db.$transaction([
      db.schoolClass.update({ where: { id: klass.id }, data: { name: input.name, level: input.level, section, isActive: input.isActive } }),
      db.auditLog.create({ data: { userId: actor.userId, action: "CLASS_UPDATED", entityType: "SchoolClass", entityId: klass.id, metadata: { class: classLabel(input.name, section), level: input.level, active: input.isActive } } }),
    ])
  } catch (e) {
    if (isUniqueViolation(e)) return fail("Please correct the form.", { name: "Another class already has this name and section." })
    throw e
  }
  return { ok: true, message: "Class details saved." }
}

// ---------------------------------------------------------------------------------------------------
// Class subjects
// ---------------------------------------------------------------------------------------------------

export async function addSubjectToClass(actor: AdminActor, input: { classKey: string; subjectCode: string }): Promise<Outcome> {
  const denied = await adminGate(actor.userId, "ClassSubject", "create")
  if (denied) return denied
  const session = await currentSession()
  if (!session) return fail("There is no current academic session. Set one up first.")
  const [klass, subject] = await Promise.all([findClass(input.classKey), db.subject.findFirst({ where: { code: input.subjectCode, isActive: true }, select: { id: true, code: true, name: true } })])
  const errors: Record<string, string> = {}
  if (!klass || !klass.isActive) errors.classKey = "Choose one of the listed classes."
  if (!subject) errors.subjectCode = "Choose one of the listed subjects."
  if (!klass || !subject || Object.keys(errors).length) return fail("Please correct the form.", errors)

  const exists = await db.classSubject.findUnique({ where: { classId_subjectId_sessionId: { classId: klass.id, subjectId: subject.id, sessionId: session.id } }, select: { id: true } })
  if (exists) return fail(`${classLabel(klass.name, klass.section)} already offers ${subject.name} in ${session.name}.`)
  try {
    const created = await db.classSubject.create({ data: { classId: klass.id, subjectId: subject.id, sessionId: session.id }, select: { id: true } })
    await db.auditLog.create({ data: { userId: actor.userId, action: "CLASS_SUBJECT_ADDED", entityType: "ClassSubject", entityId: created.id, metadata: { class: classLabel(klass.name, klass.section), subject: subject.code, session: session.name } } })
  } catch (e) {
    if (isUniqueViolation(e)) return fail("That class already offers this subject.")
    throw e
  }
  return { ok: true, message: `${subject.name} is now offered in ${classLabel(klass.name, klass.section)}.` }
}

export async function removeSubjectFromClass(actor: AdminActor, input: { classKey: string; subjectCode: string }): Promise<Outcome> {
  const denied = await adminGate(actor.userId, "ClassSubject", "remove")
  if (denied) return denied
  const session = await currentSession()
  if (!session) return fail("There is no current academic session.")
  const [klass, subject] = await Promise.all([findClass(input.classKey), db.subject.findUnique({ where: { code: input.subjectCode }, select: { id: true, code: true, name: true } })])
  if (!klass || !subject) return fail("That subject or class no longer exists.")
  const row = await db.classSubject.findUnique({ where: { classId_subjectId_sessionId: { classId: klass.id, subjectId: subject.id, sessionId: session.id } }, select: { id: true } })
  if (!row) return fail("That class does not offer this subject.")

  const entries = await db.resultEntry.count({ where: { subjectId: subject.id, result: { classId: klass.id, sessionId: session.id } } })
  if (entries > 0) return fail(`${subject.name} already has ${entries} result ${entries === 1 ? "entry" : "entries"} for this class and session, so it cannot be removed.`)

  await db.$transaction([
    db.teacherAssignment.deleteMany({ where: { classId: klass.id, subjectId: subject.id, sessionId: session.id } }),
    db.classSubject.delete({ where: { id: row.id } }),
    db.auditLog.create({ data: { userId: actor.userId, action: "CLASS_SUBJECT_REMOVED", entityType: "ClassSubject", entityId: row.id, metadata: { class: classLabel(klass.name, klass.section), subject: subject.code, session: session.name } } }),
  ])
  return { ok: true, message: `${subject.name} was removed from ${classLabel(klass.name, klass.section)} (its teacher assignments for this class were removed too).` }
}

// ---------------------------------------------------------------------------------------------------
// Subjects
// ---------------------------------------------------------------------------------------------------

export type SubjectListRow = { code: string; name: string; description: string | null; active: boolean; classes: number; teachers: number }

export async function loadSubjectList(): Promise<{ sessionName: string | null; rows: SubjectListRow[] }> {
  const session = await currentSession()
  const sid = session?.id ?? "none"
  const subjects = await db.subject.findMany({
    orderBy: { name: "asc" },
    select: {
      code: true, name: true, description: true, isActive: true,
      _count: { select: { classSubjects: { where: { sessionId: sid } } } },
      teacherAssignments: { where: { sessionId: sid }, select: { teacherId: true } },
    },
  })
  return {
    sessionName: session?.name ?? null,
    rows: subjects.map((s) => ({ code: s.code, name: s.name, description: s.description, active: s.isActive, classes: s._count.classSubjects, teachers: new Set(s.teacherAssignments.map((t) => t.teacherId)).size })),
  }
}

export type SubjectDetail = {
  code: string; name: string; description: string | null; active: boolean; sessionName: string | null
  classes: { key: string; label: string; teachers: { loginId: string; name: string }[] }[]
}

export async function loadSubjectDetail(code: string): Promise<SubjectDetail | null> {
  const subject = await db.subject.findUnique({ where: { code }, select: { id: true, code: true, name: true, description: true, isActive: true } })
  if (!subject) return null
  const session = await currentSession()
  const sid = session?.id ?? "none"
  const [offered, assignments] = await Promise.all([
    db.classSubject.findMany({ where: { subjectId: subject.id, sessionId: sid }, select: { class: { select: { name: true, section: true, level: true } } } }),
    db.teacherAssignment.findMany({
      where: { subjectId: subject.id, sessionId: sid },
      select: { class: { select: { name: true, section: true } }, teacher: { select: { user: { select: { loginId: true, firstName: true, lastName: true } } } } },
    }),
  ])
  return {
    code: subject.code, name: subject.name, description: subject.description, active: subject.isActive, sessionName: session?.name ?? null,
    classes: [...offered].sort((a, b) => a.class.level - b.class.level || a.class.name.localeCompare(b.class.name)).map((o) => {
      const key = classKey(o.class.name, o.class.section)
      return {
        key, label: classLabel(o.class.name, o.class.section),
        teachers: assignments.filter((a) => classKey(a.class.name, a.class.section) === key).map((a) => ({ loginId: a.teacher.user.loginId, name: `${a.teacher.user.firstName} ${a.teacher.user.lastName}` })),
      }
    }),
  }
}

export async function createSubject(actor: AdminActor, input: { code: string; name: string; description: string }): Promise<Outcome> {
  const denied = await adminGate(actor.userId, "Subject", "create")
  if (denied) return denied
  if (await db.subject.findUnique({ where: { code: input.code }, select: { id: true } })) return fail("Please correct the form.", { code: "That subject code is already in use." })
  try {
    const created = await db.subject.create({ data: { code: input.code, name: input.name, description: input.description || null, isActive: true }, select: { id: true } })
    await db.auditLog.create({ data: { userId: actor.userId, action: "SUBJECT_CREATED", entityType: "Subject", entityId: created.id, metadata: { code: input.code, name: input.name } } })
  } catch (e) {
    if (isUniqueViolation(e)) return fail("Please correct the form.", { code: "That subject code is already in use." })
    throw e
  }
  return { ok: true, message: `Subject ${input.name} (${input.code}) was created.` }
}

/** The subject code is the subject's identity (results and assignments refer to it), so it cannot be changed. */
export async function updateSubject(actor: AdminActor, input: { code: string; name: string; description: string; isActive: boolean }): Promise<Outcome> {
  const denied = await adminGate(actor.userId, "Subject", "update")
  if (denied) return denied
  const subject = await db.subject.findUnique({ where: { code: input.code }, select: { id: true } })
  if (!subject) return fail("That subject no longer exists.")
  await db.$transaction([
    db.subject.update({ where: { id: subject.id }, data: { name: input.name, description: input.description || null, isActive: input.isActive } }),
    db.auditLog.create({ data: { userId: actor.userId, action: "SUBJECT_UPDATED", entityType: "Subject", entityId: subject.id, metadata: { code: input.code, name: input.name, active: input.isActive } } }),
  ])
  return { ok: true, message: "Subject details saved." }
}
