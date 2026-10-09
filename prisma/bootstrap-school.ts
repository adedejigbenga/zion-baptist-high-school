/**
 * Sets up the school's STRUCTURE on a (hosted) database: the current academic session and terms, the six classes, the
 * subjects, which subjects each class offers, and the default grading scheme. It creates NO people, results or
 * announcements, and uses no passwords, so it is safe for a real deployment. Safe to run repeatedly (everything is upserted).
 *
 *   npx tsx prisma/bootstrap-school.ts
 *
 * The session dates, subject list and the grading scheme (CA 40 + Exam 60, bands A to F) are sensible defaults: confirm
 * them with the school and change them in the database before real results are entered.
 */
import { PrismaPg } from "@prisma/adapter-pg"

import { PrismaClient, TermName } from "../src/generated/prisma/client"

try {
  process.loadEnvFile(".env.local")
} catch {
  // DATABASE_URL may already be set in the environment.
}
if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is not set.")

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) })
const asDate = (value: string) => new Date(`${value}T00:00:00.000Z`)

const SESSION = { name: "2026/2027", startDate: "2026-09-14", endDate: "2027-07-23" }
const TERMS = [
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
const JUNIOR = ["ENG", "MTH", "CMP", "CVE"]
const SENIOR = ["ENG", "MTH", "BIO", "CHM", "PHY", "CMP", "ECO", "CVE"]
const OFFERED: Record<string, string[]> = { "JSS 1": JUNIOR, "JSS 2": JUNIOR, "JSS 3": JUNIOR, "SS 1": SENIOR, "SS 2": SENIOR, "SS 3": SENIOR }

const SCHEME = { name: "Standard Secondary School Grading", description: "Continuous Assessment (40) + Examination (60). Confirm with the school." }
const COMPONENTS = [
  { name: "Continuous Assessment", shortName: "CA", maxScore: 40, weight: 40, sortOrder: 1 },
  { name: "Examination", shortName: "Exam", maxScore: 60, weight: 60, sortOrder: 2 },
]
const BANDS = [
  { grade: "A", minScore: 70, maxScore: 100, remark: "Excellent", sortOrder: 1 },
  { grade: "B", minScore: 60, maxScore: 69.99, remark: "Very Good", sortOrder: 2 },
  { grade: "C", minScore: 50, maxScore: 59.99, remark: "Good", sortOrder: 3 },
  { grade: "D", minScore: 40, maxScore: 49.99, remark: "Pass", sortOrder: 4 },
  { grade: "F", minScore: 0, maxScore: 39.99, remark: "Fail", sortOrder: 5 },
]

async function main() {
  // Do not create a second "current" session if the school already has one.
  const currentExists = await prisma.academicSession.findFirst({ where: { isCurrent: true, NOT: { name: SESSION.name } } })
  if (currentExists) throw new Error(`Another session ("${currentExists.name}") is already current. Nothing was changed.`)

  const session = await prisma.academicSession.upsert({
    where: { name: SESSION.name },
    create: { name: SESSION.name, startDate: asDate(SESSION.startDate), endDate: asDate(SESSION.endDate), isCurrent: true },
    update: {},
  })
  for (const t of TERMS) {
    await prisma.term.upsert({
      where: { sessionId_name: { sessionId: session.id, name: t.name } },
      create: { sessionId: session.id, name: t.name, startDate: asDate(t.startDate), endDate: asDate(t.endDate), isCurrent: t.isCurrent },
      update: {},
    })
  }

  const classIds = new Map<string, string>()
  for (const c of CLASSES) {
    const existing = await prisma.schoolClass.findFirst({ where: { name: c.name, section: null } })
    const row = existing ?? (await prisma.schoolClass.create({ data: { name: c.name, level: c.level, section: null, isActive: true } }))
    classIds.set(c.name, row.id)
  }
  const subjectIds = new Map<string, string>()
  for (const s of SUBJECTS) {
    const row = await prisma.subject.upsert({ where: { code: s.code }, create: { code: s.code, name: s.name, isActive: true }, update: {} })
    subjectIds.set(s.code, row.id)
  }
  for (const [className, codes] of Object.entries(OFFERED)) {
    for (const code of codes) {
      const classId = classIds.get(className)!
      const subjectId = subjectIds.get(code)!
      await prisma.classSubject.upsert({
        where: { classId_subjectId_sessionId: { classId, subjectId, sessionId: session.id } },
        create: { classId, subjectId, sessionId: session.id },
        update: {},
      })
    }
  }

  const hasDefault = await prisma.gradingScheme.findFirst({ where: { isDefault: true, NOT: { name: SCHEME.name } } })
  if (hasDefault) throw new Error(`A different default grading scheme ("${hasDefault.name}") already exists. Nothing more was changed.`)
  const scheme = await prisma.gradingScheme.upsert({
    where: { name: SCHEME.name },
    create: { ...SCHEME, isDefault: true },
    update: {},
  })
  for (const c of COMPONENTS) {
    await prisma.assessmentComponent.upsert({
      where: { gradingSchemeId_shortName: { gradingSchemeId: scheme.id, shortName: c.shortName } },
      create: { gradingSchemeId: scheme.id, ...c },
      update: {},
    })
  }
  for (const b of BANDS) {
    await prisma.gradeBand.upsert({
      where: { gradingSchemeId_grade: { gradingSchemeId: scheme.id, grade: b.grade } },
      create: { gradingSchemeId: scheme.id, ...b },
      update: {},
    })
  }

  console.log(
    `School structure ready: session ${SESSION.name}, ${TERMS.length} terms, ${CLASSES.length} classes, ${SUBJECTS.length} subjects, grading scheme "${SCHEME.name}".`,
  )
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error)
    process.exitCode = 1
  })
  .finally(() => prisma.$disconnect())
