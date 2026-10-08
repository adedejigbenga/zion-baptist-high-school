import { db } from "@/lib/db"
import type { Actor } from "@/lib/services/teacher-workspace"

/** Shared database fixture for service tests: two teachers, three classes, three subjects, four students, a grading scheme. */
export async function world() {
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
