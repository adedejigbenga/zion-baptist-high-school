/**
 * DEVELOPMENT / DEMO seed. Fictional data only. Safe to run repeatedly (everything is looked up by its
 * natural key and upserted). Never run against a production database.
 *
 *   npx prisma db seed
 *
 * All demo accounts share one DEVELOPMENT-ONLY password (see README "Demo accounts"). Passwords are
 * hashed with Argon2id before they are stored; existing accounts keep their stored hash on re-runs.
 */
import { hash } from "@node-rs/argon2"
import { PrismaPg } from "@prisma/adapter-pg"

import { Gender, PrismaClient, ResultStatus, Role, TermName } from "../src/generated/prisma/client"

try {
  process.loadEnvFile(".env.local")
} catch {
  // DATABASE_URL may already be set in the environment (prisma db seed passes it through).
}

if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is not set.")
if (process.env.NODE_ENV === "production") throw new Error("Refusing to seed demo data in production.")

// Safety: demo data and the shared demo password must never reach a shared or hosted database.
// NODE_ENV alone is not enough (it is usually unset on a developer machine), so also require a local host.
const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1", "[::1]"])
let databaseHost: string
try {
  databaseHost = new URL(process.env.DATABASE_URL).hostname.toLowerCase()
} catch {
  throw new Error("DATABASE_URL is not a valid connection string.")
}
if (!LOCAL_HOSTS.has(databaseHost)) {
  throw new Error(
    "Refusing to seed: DATABASE_URL does not point at this machine (localhost). " +
      "The development seed only runs against a local database.",
  )
}

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) })

/** DEVELOPMENT ONLY. Documented in README.md. Never use anywhere real. */
const DEMO_PASSWORD = "ZionDemo#2026"

// ---------------------------------------------------------------------------------------------------
// Reference data
// ---------------------------------------------------------------------------------------------------

const SESSION = { name: "2026/2027", startDate: "2026-09-14", endDate: "2027-07-23" }

const TERMS: { name: TermName; startDate: string; endDate: string; isCurrent: boolean }[] = [
  { name: TermName.FIRST, startDate: "2026-09-14", endDate: "2026-12-18", isCurrent: true },
  { name: TermName.SECOND, startDate: "2027-01-11", endDate: "2027-04-02", isCurrent: false },
  { name: TermName.THIRD, startDate: "2027-04-26", endDate: "2027-07-23", isCurrent: false },
]

const CLASSES = [
  { name: "JSS 1", level: 1 },
  { name: "JSS 2", level: 2 },
  { name: "JSS 3", level: 3 },
  { name: "SS 1", level: 4 },
  { name: "SS 2", level: 5 },
  { name: "SS 3", level: 6 },
]

const SUBJECTS = [
  { code: "ENG", name: "English Language" },
  { code: "MTH", name: "Mathematics" },
  { code: "BIO", name: "Biology" },
  { code: "CHM", name: "Chemistry" },
  { code: "PHY", name: "Physics" },
  { code: "CMP", name: "Computer Studies" },
  { code: "ECO", name: "Economics" },
  { code: "CVE", name: "Civic Education" },
]

const JUNIOR_SUBJECTS = ["ENG", "MTH", "CMP", "CVE"]
const SENIOR_SUBJECTS = ["ENG", "MTH", "BIO", "CHM", "PHY", "CMP", "ECO", "CVE"]

/** Which subjects each class offers this session. */
const CLASS_SUBJECTS: Record<string, string[]> = {
  "JSS 1": JUNIOR_SUBJECTS,
  "JSS 2": JUNIOR_SUBJECTS,
  "JSS 3": JUNIOR_SUBJECTS,
  "SS 1": SENIOR_SUBJECTS,
  "SS 2": SENIOR_SUBJECTS,
  "SS 3": SENIOR_SUBJECTS,
}

const ADMIN = { loginId: "admin.demo", firstName: "System", lastName: "Administrator" }

const TEACHERS = [
  { loginId: "teacher.math", employeeNumber: "TCH001", firstName: "Peter", lastName: "Okoro", department: "Mathematics" },
  { loginId: "teacher.english", employeeNumber: "TCH002", firstName: "Ngozi", lastName: "Eze", department: "Languages" },
  { loginId: "teacher.science", employeeNumber: "TCH003", firstName: "Blessing", lastName: "Okon", department: "Sciences" },
]

/** [teacher loginId, subject code, classes] */
const ASSIGNMENTS: [string, string, string[]][] = [
  ["teacher.math", "MTH", ["JSS 1", "JSS 2", "SS 1", "SS 2"]],
  ["teacher.english", "ENG", ["JSS 1", "JSS 2", "SS 1", "SS 2"]],
  ["teacher.science", "BIO", ["SS 1", "SS 2"]],
  ["teacher.science", "CHM", ["SS 1", "SS 2"]],
]

/** Students log in with their admission number. */
const STUDENTS = [
  { admissionNumber: "ZBHS/2026/001", firstName: "Daniel", lastName: "Ade", gender: Gender.MALE, dateOfBirth: "2014-03-12", className: "JSS 1" },
  { admissionNumber: "ZBHS/2026/002", firstName: "Grace", lastName: "Bello", gender: Gender.FEMALE, dateOfBirth: "2014-07-25", className: "JSS 1" },
  { admissionNumber: "ZBHS/2026/003", firstName: "Samuel", lastName: "James", gender: Gender.MALE, dateOfBirth: "2013-01-30", className: "JSS 2" },
  { admissionNumber: "ZBHS/2026/004", firstName: "Esther", lastName: "Cole", gender: Gender.FEMALE, dateOfBirth: "2011-11-08", className: "SS 1" },
  { admissionNumber: "ZBHS/2026/005", firstName: "David", lastName: "Peter", gender: Gender.MALE, dateOfBirth: "2011-05-19", className: "SS 1" },
  { admissionNumber: "ZBHS/2026/006", firstName: "Ruth", lastName: "Samuel", gender: Gender.FEMALE, dateOfBirth: "2009-09-02", className: "SS 3" },
]

const GRADING_SCHEME = {
  name: "Standard Secondary School Grading",
  description: "Default development scheme: Continuous Assessment (40) + Examination (60).",
}

const COMPONENTS = [
  { name: "Continuous Assessment", shortName: "CA", maxScore: 40, weight: 40, sortOrder: 1 },
  { name: "Examination", shortName: "Exam", maxScore: 60, weight: 60, sortOrder: 2 },
]

const GRADE_BANDS = [
  { grade: "A", minScore: 70, maxScore: 100, remark: "Excellent", sortOrder: 1 },
  { grade: "B", minScore: 60, maxScore: 69.99, remark: "Very Good", sortOrder: 2 },
  { grade: "C", minScore: 50, maxScore: 59.99, remark: "Good", sortOrder: 3 },
  { grade: "D", minScore: 40, maxScore: 49.99, remark: "Pass", sortOrder: 4 },
  { grade: "F", minScore: 0, maxScore: 39.99, remark: "Fail", sortOrder: 5 },
]

/** Demo results for the FIRST term. scores: [subject code, CA, Exam]. */
const DEMO_RESULTS: {
  admissionNumber: string
  status: ResultStatus
  scores: [string, number, number][]
}[] = [
  {
    admissionNumber: "ZBHS/2026/001", // Daniel Ade, JSS 1: the one PUBLISHED result
    status: ResultStatus.PUBLISHED,
    scores: [["ENG", 34, 52], ["MTH", 30, 44], ["CMP", 27, 38], ["CVE", 31, 45]],
  },
  {
    admissionNumber: "ZBHS/2026/002", // Grace Bello, JSS 1: complete, awaiting review
    status: ResultStatus.SUBMITTED,
    scores: [["ENG", 25, 39], ["MTH", 22, 31], ["CMP", 30, 40], ["CVE", 28, 42]],
  },
  {
    admissionNumber: "ZBHS/2026/004", // Esther Cole, SS 1: partly entered draft
    status: ResultStatus.DRAFT,
    scores: [["ENG", 20, 35], ["MTH", 18, 29], ["BIO", 26, 41]],
  },
  {
    admissionNumber: "ZBHS/2026/003", // Samuel James, JSS 2: draft
    status: ResultStatus.DRAFT,
    scores: [["ENG", 24, 36], ["MTH", 15, 22]],
  },
]

const PUBLISHED_AT = new Date("2026-10-02T10:00:00.000Z")

/**
 * Demo announcements. Some must be visible to students and some deliberately must NOT be (unpublished, expired,
 * scheduled for the future, or aimed at another class), so the filtering rules can be checked against real data.
 */
const ANNOUNCEMENTS: {
  title: string
  content: string
  isPublished: boolean
  publishedAt: string | null
  expiresAt: string | null
  className: string | null
}[] = [
  {
    title: "Welcome to the 2026/2027 Academic Session",
    content: "We welcome all students and parents to the new session. Classes for the First Term are now in progress.",
    isPublished: true, publishedAt: "2026-09-10T08:00:00.000Z", expiresAt: null, className: null,
  },
  {
    title: "First Term Examination Timetable",
    content: "The First Term examination timetable will be shared with every class before the examination period begins.",
    isPublished: true, publishedAt: "2026-09-25T08:00:00.000Z", expiresAt: null, className: null,
  },
  {
    title: "JSS 1 Parents' Meeting",
    content: "Parents and guardians of JSS 1 students are invited to a short meeting with the class teachers.",
    isPublished: true, publishedAt: "2026-09-18T08:00:00.000Z", expiresAt: null, className: "JSS 1",
  },
  {
    title: "SS 1 Study Visit",
    content: "SS 1 students will take part in a supervised study visit. Details will be given in class.",
    isPublished: true, publishedAt: "2026-09-20T08:00:00.000Z", expiresAt: null, className: "SS 1",
  },
  {
    title: "SS 3 Final Year Briefing",
    content: "A briefing for final-year students on the coming examinations.",
    isPublished: true, publishedAt: "2026-09-22T08:00:00.000Z", expiresAt: null, className: "SS 3",
  },
  {
    title: "HIDDEN (unpublished): Staff Meeting",
    content: "This is a draft and must not be shown to students.",
    isPublished: false, publishedAt: null, expiresAt: null, className: null,
  },
  {
    title: "HIDDEN (expired): Registration Deadline",
    content: "This announcement has expired and must not be shown to students.",
    isPublished: true, publishedAt: "2026-08-01T08:00:00.000Z", expiresAt: "2026-09-30T00:00:00.000Z", className: null,
  },
  {
    title: "HIDDEN (scheduled): Future Notice",
    content: "This is scheduled for the future and must not be shown yet.",
    isPublished: true, publishedAt: "2099-01-01T08:00:00.000Z", expiresAt: null, className: null,
  },
]

// ---------------------------------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------------------------------

const asDate = (iso: string) => new Date(`${iso}T00:00:00.000Z`)

async function upsertUser(
  passwordHash: string,
  data: { loginId: string; role: Role; firstName: string; lastName: string },
) {
  return prisma.user.upsert({
    where: { loginId: data.loginId },
    // passwordHash is only set on create, so re-running never changes an existing account's hash.
    create: { ...data, passwordHash, isActive: true },
    update: { role: data.role, firstName: data.firstName, lastName: data.lastName, isActive: true },
  })
}

function must<T>(map: Map<string, T>, key: string, what: string): T {
  const value = map.get(key)
  if (!value) throw new Error(`Seed error: unknown ${what} "${key}"`)
  return value
}

// ---------------------------------------------------------------------------------------------------
// Seed
// ---------------------------------------------------------------------------------------------------

async function main() {
  const passwordHash = await hash(DEMO_PASSWORD, { memoryCost: 19456, timeCost: 2, parallelism: 1 })

  // Admin
  const adminUser = await upsertUser(passwordHash, { ...ADMIN, role: Role.ADMIN })
  await prisma.admin.upsert({ where: { userId: adminUser.id }, create: { userId: adminUser.id }, update: {} })

  // Academic session and terms
  const session = await prisma.academicSession.upsert({
    where: { name: SESSION.name },
    create: { name: SESSION.name, startDate: asDate(SESSION.startDate), endDate: asDate(SESSION.endDate), isCurrent: true },
    update: { startDate: asDate(SESSION.startDate), endDate: asDate(SESSION.endDate), isCurrent: true },
  })

  const terms = new Map<TermName, { id: string }>()
  for (const t of TERMS) {
    const term = await prisma.term.upsert({
      where: { sessionId_name: { sessionId: session.id, name: t.name } },
      create: { sessionId: session.id, name: t.name, startDate: asDate(t.startDate), endDate: asDate(t.endDate), isCurrent: t.isCurrent },
      update: { startDate: asDate(t.startDate), endDate: asDate(t.endDate), isCurrent: t.isCurrent },
    })
    terms.set(t.name, term)
  }

  // Classes (section is null, so (name, section) cannot be used as an upsert key)
  const classes = new Map<string, { id: string }>()
  for (const c of CLASSES) {
    const existing = await prisma.schoolClass.findFirst({ where: { name: c.name, section: null } })
    const row = existing
      ? await prisma.schoolClass.update({ where: { id: existing.id }, data: { level: c.level, isActive: true } })
      : await prisma.schoolClass.create({ data: { name: c.name, level: c.level, section: null, isActive: true } })
    classes.set(c.name, row)
  }

  // Subjects
  const subjects = new Map<string, { id: string }>()
  for (const s of SUBJECTS) {
    const row = await prisma.subject.upsert({
      where: { code: s.code },
      create: { code: s.code, name: s.name, isActive: true },
      update: { name: s.name, isActive: true },
    })
    subjects.set(s.code, row)
  }

  // Class subjects
  for (const [className, codes] of Object.entries(CLASS_SUBJECTS)) {
    const classId = must(classes, className, "class").id
    for (const code of codes) {
      const subjectId = must(subjects, code, "subject").id
      await prisma.classSubject.upsert({
        where: { classId_subjectId_sessionId: { classId, subjectId, sessionId: session.id } },
        create: { classId, subjectId, sessionId: session.id },
        update: {},
      })
    }
  }

  // Teachers and their assignments
  const teachers = new Map<string, { id: string }>()
  for (const t of TEACHERS) {
    const user = await upsertUser(passwordHash, { loginId: t.loginId, role: Role.TEACHER, firstName: t.firstName, lastName: t.lastName })
    const teacher = await prisma.teacher.upsert({
      where: { userId: user.id },
      create: { userId: user.id, employeeNumber: t.employeeNumber, department: t.department },
      update: { employeeNumber: t.employeeNumber, department: t.department },
    })
    teachers.set(t.loginId, teacher)
  }

  for (const [loginId, code, classNames] of ASSIGNMENTS) {
    const teacherId = must(teachers, loginId, "teacher").id
    const subjectId = must(subjects, code, "subject").id
    for (const className of classNames) {
      const classId = must(classes, className, "class").id
      await prisma.teacherAssignment.upsert({
        where: { teacherId_classId_subjectId_sessionId: { teacherId, classId, subjectId, sessionId: session.id } },
        create: { teacherId, classId, subjectId, sessionId: session.id },
        update: {},
      })
    }
  }

  // Students and enrolments
  const students = new Map<string, { id: string; classId: string }>()
  for (const s of STUDENTS) {
    const user = await upsertUser(passwordHash, { loginId: s.admissionNumber, role: Role.STUDENT, firstName: s.firstName, lastName: s.lastName })
    const student = await prisma.student.upsert({
      where: { userId: user.id },
      create: { userId: user.id, admissionNumber: s.admissionNumber, gender: s.gender, dateOfBirth: asDate(s.dateOfBirth) },
      update: { admissionNumber: s.admissionNumber, gender: s.gender, dateOfBirth: asDate(s.dateOfBirth) },
    })
    const classId = must(classes, s.className, "class").id
    await prisma.studentEnrollment.upsert({
      where: { studentId_sessionId: { studentId: student.id, sessionId: session.id } },
      create: { studentId: student.id, classId, sessionId: session.id },
      update: { classId, isActive: true },
    })
    students.set(s.admissionNumber, { id: student.id, classId })
  }

  // Grading scheme, components and bands (values live in the database, not in application code)
  const scheme = await prisma.gradingScheme.upsert({
    where: { name: GRADING_SCHEME.name },
    create: { ...GRADING_SCHEME, isDefault: true },
    update: { description: GRADING_SCHEME.description, isDefault: true },
  })
  const components: Awaited<ReturnType<typeof prisma.assessmentComponent.upsert>>[] = []
  for (const c of COMPONENTS) {
    components.push(
      await prisma.assessmentComponent.upsert({
        where: { gradingSchemeId_shortName: { gradingSchemeId: scheme.id, shortName: c.shortName } },
        create: { gradingSchemeId: scheme.id, ...c },
        update: { name: c.name, maxScore: c.maxScore, weight: c.weight, sortOrder: c.sortOrder },
      }),
    )
  }
  for (const b of GRADE_BANDS) {
    await prisma.gradeBand.upsert({
      where: { gradingSchemeId_grade: { gradingSchemeId: scheme.id, grade: b.grade } },
      create: { gradingSchemeId: scheme.id, ...b },
      update: { minScore: b.minScore, maxScore: b.maxScore, remark: b.remark, sortOrder: b.sortOrder },
    })
  }
  const bands = await prisma.gradeBand.findMany({ where: { gradingSchemeId: scheme.id } })

  // total = sum(score / maxScore * weight), then the grade band for that total (same rule the future grading service will use)
  const gradeFor = (scores: Map<string, number>) => {
    const total =
      Math.round(
        components.reduce((sum, c) => sum + (must(scores, c.shortName, "component score") / Number(c.maxScore)) * Number(c.weight), 0) * 100,
      ) / 100
    const band = bands.find((b) => total >= Number(b.minScore) && total <= Number(b.maxScore))
    if (!band) throw new Error(`Seed error: no grade band for total ${total}`)
    return { total, grade: band.grade, remark: band.remark }
  }

  // Demo results (first term)
  const firstTermId = must(terms as Map<string, { id: string }>, TermName.FIRST, "term").id
  for (const r of DEMO_RESULTS) {
    const student = must(students, r.admissionNumber, "student")
    const published = r.status === ResultStatus.PUBLISHED

    const result = await prisma.result.upsert({
      where: { studentId_sessionId_termId: { studentId: student.id, sessionId: session.id, termId: firstTermId } },
      create: {
        studentId: student.id,
        sessionId: session.id,
        termId: firstTermId,
        classId: student.classId,
        gradingSchemeId: scheme.id,
        status: r.status,
        publishedAt: published ? PUBLISHED_AT : null,
        publishedById: published ? adminUser.id : null,
      },
      update: {
        classId: student.classId,
        gradingSchemeId: scheme.id,
        status: r.status,
        publishedAt: published ? PUBLISHED_AT : null,
        publishedById: published ? adminUser.id : null,
      },
    })

    for (const [code, ca, exam] of r.scores) {
      const subjectId = must(subjects, code, "subject").id
      const { total, grade, remark } = gradeFor(new Map([["CA", ca], ["Exam", exam]]))
      const entry = await prisma.resultEntry.upsert({
        where: { resultId_subjectId: { resultId: result.id, subjectId } },
        create: { resultId: result.id, subjectId, totalScore: total, grade, remark },
        update: { totalScore: total, grade, remark },
      })
      for (const [shortName, score] of [["CA", ca], ["Exam", exam]] as const) {
        const assessmentComponentId = must(new Map(components.map((c) => [c.shortName, c])), shortName, "component").id
        await prisma.resultEntryScore.upsert({
          where: { resultEntryId_assessmentComponentId: { resultEntryId: entry.id, assessmentComponentId } },
          create: { resultEntryId: entry.id, assessmentComponentId, score },
          update: { score },
        })
      }
    }

    // Publication history (one PUBLISHED row for the published result, created once)
    if (published) {
      const already = await prisma.resultPublication.findFirst({ where: { resultId: result.id, action: "PUBLISHED" } })
      if (already) {
        await prisma.resultPublication.update({ where: { id: already.id }, data: { publishedAt: PUBLISHED_AT, publishedById: adminUser.id } })
      } else {
        await prisma.resultPublication.create({
          data: { resultId: result.id, publishedById: adminUser.id, publishedAt: PUBLISHED_AT, action: "PUBLISHED" },
        })
      }
    }
  }

  // Announcements (no unique key exists, so look each one up by title)
  for (const a of ANNOUNCEMENTS) {
    const targetClassId = a.className ? must(classes, a.className, "class").id : null
    const data = {
      content: a.content,
      isPublished: a.isPublished,
      publishedAt: a.publishedAt ? new Date(a.publishedAt) : null,
      expiresAt: a.expiresAt ? new Date(a.expiresAt) : null,
      targetClassId,
      createdById: adminUser.id,
    }
    const existing = await prisma.announcement.findFirst({ where: { title: a.title } })
    if (existing) await prisma.announcement.update({ where: { id: existing.id }, data })
    else await prisma.announcement.create({ data: { title: a.title, ...data } })
  }

  // Summary (counts only; no personal data, no secrets)
  const counts = {
    users: await prisma.user.count(),
    admins: await prisma.admin.count(),
    teachers: await prisma.teacher.count(),
    students: await prisma.student.count(),
    classes: await prisma.schoolClass.count(),
    subjects: await prisma.subject.count(),
    sessions: await prisma.academicSession.count(),
    terms: await prisma.term.count(),
    enrollments: await prisma.studentEnrollment.count(),
    classSubjects: await prisma.classSubject.count(),
    teacherAssignments: await prisma.teacherAssignment.count(),
    gradingSchemes: await prisma.gradingScheme.count(),
    assessmentComponents: await prisma.assessmentComponent.count(),
    gradeBands: await prisma.gradeBand.count(),
    results: await prisma.result.count(),
    resultEntries: await prisma.resultEntry.count(),
    resultEntryScores: await prisma.resultEntryScore.count(),
    resultPublications: await prisma.resultPublication.count(),
    announcements: await prisma.announcement.count(),
  }
  console.log("Seed complete:", counts)
}

main()
  .catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(() => prisma.$disconnect())
