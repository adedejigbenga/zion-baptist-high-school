import { afterAll, beforeEach, describe, expect, it } from "vitest"

import type { ResultStatus } from "@/generated/prisma/enums"
import { db } from "@/lib/db"
import {
  loadStudentAnnouncements,
  loadStudentDashboard,
  loadStudentProfile,
  loadStudentProfileSummary,
} from "@/lib/services/student-dashboard"
import { resetDatabase } from "@/test/helpers"

const NOW = new Date("2026-10-07T12:00:00.000Z")
const days = (n: number) => new Date(NOW.getTime() + n * 24 * 60 * 60 * 1000)

/** Distinctive values that must NEVER appear in what a student's dashboard returns. */
const SECRETS = ["87.31", "33.33", "SECRET-REMARK-XYZ", "Quantum Mathematics", "QQ-GRADE"]

beforeEach(resetDatabase)
afterAll(() => db.$disconnect())

async function world() {
  const session = await db.academicSession.create({
    data: { name: "2026/2027", startDate: new Date("2026-09-14"), endDate: new Date("2027-07-23"), isCurrent: true },
  })
  const term = await db.term.create({
    data: { name: "FIRST", sessionId: session.id, startDate: new Date("2026-09-14"), endDate: new Date("2026-12-18"), isCurrent: true },
  })
  const otherTerm = await db.term.create({
    data: { name: "SECOND", sessionId: session.id, startDate: new Date("2027-01-11"), endDate: new Date("2027-04-02"), isCurrent: false },
  })
  const jss1 = await db.schoolClass.create({ data: { name: "JSS 1", level: 1 } })
  const ss1 = await db.schoolClass.create({ data: { name: "SS 1", level: 4 } })
  const scheme = await db.gradingScheme.create({ data: { name: "Test scheme", isDefault: true } })
  const component = await db.assessmentComponent.create({
    data: { gradingSchemeId: scheme.id, name: "Exam", shortName: "Exam", maxScore: 100, weight: 100 },
  })
  const subject = await db.subject.create({ data: { code: "QM", name: "Quantum Mathematics" } })
  const admin = await db.user.create({
    data: { loginId: "admin.t", passwordHash: "x", role: "ADMIN", firstName: "Ada", lastName: "Min", admin: { create: {} } },
  })
  return { session, term, otherTerm, jss1, ss1, scheme, component, subject, admin }
}
type World = Awaited<ReturnType<typeof world>>

async function addStudent(w: World, opts: { admission: string; first: string; last: string; classId?: string | null; active?: boolean }) {
  const user = await db.user.create({
    data: { loginId: opts.admission, passwordHash: "x", role: "STUDENT", firstName: opts.first, lastName: opts.last },
  })
  const student = await db.student.create({ data: { userId: user.id, admissionNumber: opts.admission } })
  if (opts.classId) {
    await db.studentEnrollment.create({
      data: { studentId: student.id, classId: opts.classId, sessionId: w.session.id, isActive: opts.active ?? true },
    })
  }
  return student
}

/** A result carrying secret entry data, in any status and for any term. */
async function addResult(w: World, studentId: string, classId: string, status: ResultStatus, termId = w.term.id) {
  const result = await db.result.create({
    data: {
      studentId, sessionId: w.session.id, termId, classId, gradingSchemeId: w.scheme.id, status,
      publishedAt: status === "PUBLISHED" ? NOW : null,
      publishedById: status === "PUBLISHED" ? w.admin.id : null,
    },
  })
  const entry = await db.resultEntry.create({
    data: { resultId: result.id, subjectId: w.subject.id, totalScore: 87.31, grade: "QQ-GRADE", remark: "SECRET-REMARK-XYZ" },
  })
  await db.resultEntryScore.create({ data: { resultEntryId: entry.id, assessmentComponentId: w.component.id, score: 33.33 } })
  return result
}

function expectNoSecrets(value: unknown) {
  const text = JSON.stringify(value)
  for (const secret of SECRETS) expect(text, `leaked "${secret}"`).not.toContain(secret)
}

describe("student dashboard: whose data", () => {
  it("returns only the requested student's own details, never another student's", async () => {
    const w = await world()
    const daniel = await addStudent(w, { admission: "ZBHS/T/001", first: "Daniel", last: "Ade", classId: w.jss1.id })
    await addStudent(w, { admission: "ZBHS/T/002", first: "Esther", last: "Cole", classId: w.ss1.id })

    const dashboard = await loadStudentDashboard(daniel.id, NOW)
    expect(dashboard?.student).toEqual({ firstName: "Daniel", lastName: "Ade", admissionNumber: "ZBHS/T/001" })
    expect(dashboard?.enrollment).toEqual({ className: "JSS 1", section: null })
    expect(dashboard?.academic).toEqual({ sessionName: "2026/2027", termName: "FIRST" })

    const text = JSON.stringify(dashboard)
    expect(text).not.toContain("Esther")
    expect(text).not.toContain("ZBHS/T/002")
    expect(text).not.toContain("\"SS 1\"") // the exact class name ("JSS 1" legitimately contains the letters "SS 1")
  })

  it("returns null for an unknown student ID instead of anything else", async () => {
    await world()
    expect(await loadStudentDashboard("does-not-exist", NOW)).toBeNull()
    expect(await loadStudentProfileSummary("does-not-exist")).toBeNull()
  })

  it("includes the class section when there is one", async () => {
    const w = await world()
    const classA = await db.schoolClass.create({ data: { name: "JSS 2", level: 2, section: "A" } })
    const s = await addStudent(w, { admission: "ZBHS/T/003", first: "Sam", last: "Jay", classId: classA.id })
    expect((await loadStudentDashboard(s.id, NOW))?.enrollment).toEqual({ className: "JSS 2", section: "A" })
  })
})

describe("student dashboard: result status and privacy", () => {
  it.each([
    ["PUBLISHED", "PUBLISHED"],
    ["SUBMITTED", "IN_PROGRESS"],
    ["DRAFT", "IN_PROGRESS"],
  ] as const)("a %s result is reported as %s", async (status, expected) => {
    const w = await world()
    const s = await addStudent(w, { admission: "ZBHS/T/001", first: "Daniel", last: "Ade", classId: w.jss1.id })
    await addResult(w, s.id, w.jss1.id, status)
    const dashboard = await loadStudentDashboard(s.id, NOW)
    expect(dashboard?.result.state).toBe(expected)
    if (expected === "PUBLISHED") expect(dashboard?.result).toEqual({ state: "PUBLISHED", publishedAt: NOW })
  })

  it("does not report a publish date that lies in the future", async () => {
    const w = await world()
    const s = await addStudent(w, { admission: "ZBHS/T/001", first: "Daniel", last: "Ade", classId: w.jss1.id })
    const result = await addResult(w, s.id, w.jss1.id, "PUBLISHED")
    await db.result.update({ where: { id: result.id }, data: { publishedAt: days(30) } })
    expect((await loadStudentDashboard(s.id, NOW))?.result).toEqual({ state: "PUBLISHED", publishedAt: null })
  })

  it("never returns scores, grades, totals, remarks or subjects, whatever the status", async () => {
    const w = await world()
    for (const [i, status] of (["DRAFT", "SUBMITTED", "PUBLISHED"] as const).entries()) {
      const s = await addStudent(w, { admission: `ZBHS/T/10${i}`, first: "Stu", last: `Dent${i}`, classId: w.jss1.id })
      await addResult(w, s.id, w.jss1.id, status)
      const dashboard = await loadStudentDashboard(s.id, NOW)
      expectNoSecrets(dashboard)
      expect(JSON.stringify(dashboard)).not.toMatch(/totalScore|remark|"grade"|"score"|entries/i)
    }
  })

  it("reports 'not started' when no result exists yet", async () => {
    const w = await world()
    const s = await addStudent(w, { admission: "ZBHS/T/001", first: "David", last: "Peter", classId: w.jss1.id })
    expect((await loadStudentDashboard(s.id, NOW))?.result).toEqual({ state: "NOT_STARTED" })
  })

  it("looks only at the CURRENT term: a published result from another term does not count", async () => {
    const w = await world()
    const s = await addStudent(w, { admission: "ZBHS/T/001", first: "Daniel", last: "Ade", classId: w.jss1.id })
    await addResult(w, s.id, w.jss1.id, "PUBLISHED", w.otherTerm.id)
    expect((await loadStudentDashboard(s.id, NOW))?.result).toEqual({ state: "NOT_STARTED" })
  })

  it("one student's published result is not reported for another student", async () => {
    const w = await world()
    const a = await addStudent(w, { admission: "ZBHS/T/001", first: "Daniel", last: "Ade", classId: w.jss1.id })
    const b = await addStudent(w, { admission: "ZBHS/T/002", first: "Grace", last: "Bello", classId: w.jss1.id })
    await addResult(w, a.id, w.jss1.id, "PUBLISHED")
    expect((await loadStudentDashboard(a.id, NOW))?.result.state).toBe("PUBLISHED")
    expect((await loadStudentDashboard(b.id, NOW))?.result.state).toBe("NOT_STARTED")
  })
})

describe("student dashboard: missing set-up", () => {
  it("reports NO_ENROLLMENT when the student has no class this session", async () => {
    const w = await world()
    const s = await addStudent(w, { admission: "ZBHS/T/001", first: "Daniel", last: "Ade", classId: null })
    await addResult(w, s.id, w.jss1.id, "PUBLISHED")
    const dashboard = await loadStudentDashboard(s.id, NOW)
    expect(dashboard?.enrollment).toBeNull()
    expect(dashboard?.result).toEqual({ state: "NO_ENROLLMENT" })
    expectNoSecrets(dashboard)
  })

  it("ignores an inactive enrolment", async () => {
    const w = await world()
    const s = await addStudent(w, { admission: "ZBHS/T/001", first: "Daniel", last: "Ade", classId: w.jss1.id, active: false })
    expect((await loadStudentDashboard(s.id, NOW))?.enrollment).toBeNull()
  })

  it("reports NO_TERM when no session or term is current", async () => {
    const w = await world()
    const s = await addStudent(w, { admission: "ZBHS/T/001", first: "Daniel", last: "Ade", classId: w.jss1.id })

    await db.term.update({ where: { id: w.term.id }, data: { isCurrent: false } })
    const noTerm = await loadStudentDashboard(s.id, NOW)
    expect(noTerm?.result).toEqual({ state: "NO_TERM" })
    expect(noTerm?.academic).toEqual({ sessionName: "2026/2027", termName: null })

    await db.academicSession.update({ where: { id: w.session.id }, data: { isCurrent: false } })
    const noSession = await loadStudentDashboard(s.id, NOW)
    expect(noSession?.academic).toEqual({ sessionName: null, termName: null })
    expect(noSession?.enrollment).toBeNull()
  })
})

describe("student dashboard: announcements", () => {
  async function announce(w: World, title: string, o: { published?: boolean; at?: Date | null; expires?: Date | null; classId?: string | null; content?: string } = {}) {
    return db.announcement.create({
      data: {
        title, content: o.content ?? `${title} body`, isPublished: o.published ?? true,
        publishedAt: o.at === undefined ? days(-5) : o.at, expiresAt: o.expires ?? null,
        targetClassId: o.classId ?? null, createdById: w.admin.id,
      },
    })
  }

  it("shows school-wide and own-class announcements, and hides everything else", async () => {
    const w = await world()
    const s = await addStudent(w, { admission: "ZBHS/T/001", first: "Daniel", last: "Ade", classId: w.jss1.id })
    await announce(w, "School-wide", { at: days(-1) })
    await announce(w, "For JSS 1", { at: days(-2), classId: w.jss1.id })
    await announce(w, "For SS 1", { classId: w.ss1.id })
    await announce(w, "Unpublished", { published: false })
    await announce(w, "Expired", { expires: days(-1) })
    await announce(w, "Scheduled", { at: days(30) })

    const titles = (await loadStudentDashboard(s.id, NOW))?.announcements.map((a) => a.title)
    expect(titles).toEqual(["School-wide", "For JSS 1"]) // newest first
    const jss1 = (await loadStudentDashboard(s.id, NOW))?.announcements.find((a) => a.title === "For JSS 1")
    expect(jss1?.className).toBe("JSS 1")
  })

  it("treats an announcement with no publish date as live, and one that expires later as still live", async () => {
    const w = await world()
    const s = await addStudent(w, { admission: "ZBHS/T/001", first: "Daniel", last: "Ade", classId: w.jss1.id })
    await announce(w, "No date", { at: null })
    await announce(w, "Expires next week", { expires: days(7) })
    const titles = (await loadStudentDashboard(s.id, NOW))?.announcements.map((a) => a.title) ?? []
    expect(titles).toContain("No date")
    expect(titles).toContain("Expires next week")
  })

  it("shows only school-wide announcements to a student with no class", async () => {
    const w = await world()
    const s = await addStudent(w, { admission: "ZBHS/T/001", first: "Daniel", last: "Ade", classId: null })
    await announce(w, "School-wide")
    await announce(w, "For JSS 1", { classId: w.jss1.id })
    expect((await loadStudentDashboard(s.id, NOW))?.announcements.map((a) => a.title)).toEqual(["School-wide"])
  })

  it("returns at most 5, newest first, with shortened text", async () => {
    const w = await world()
    const s = await addStudent(w, { admission: "ZBHS/T/001", first: "Daniel", last: "Ade", classId: w.jss1.id })
    for (let i = 1; i <= 7; i++) await announce(w, `Notice ${i}`, { at: days(-10 + i), content: "word ".repeat(100) })
    const list = (await loadStudentDashboard(s.id, NOW))?.announcements ?? []
    expect(list.map((a) => a.title)).toEqual(["Notice 7", "Notice 6", "Notice 5", "Notice 4", "Notice 3"])
    for (const a of list) expect(a.excerpt.length).toBeLessThanOrEqual(141)
    expect(list[0].excerpt.endsWith("…")).toBe(true)
  })

  it("returns an empty list when there is nothing to show", async () => {
    const w = await world()
    const s = await addStudent(w, { admission: "ZBHS/T/001", first: "Daniel", last: "Ade", classId: w.jss1.id })
    expect((await loadStudentDashboard(s.id, NOW))?.announcements).toEqual([])
  })
})

describe("student announcements page and profile", () => {
  async function announce(w: World, title: string, o: { published?: boolean; expires?: Date | null; classId?: string | null } = {}) {
    return db.announcement.create({
      data: {
        title, content: `${title} body`, isPublished: o.published ?? true, publishedAt: days(-3),
        expiresAt: o.expires ?? null, targetClassId: o.classId ?? null, createdById: w.admin.id,
      },
    })
  }

  it("lists every visible announcement (not just five) with its category, and hides the rest", async () => {
    const w = await world()
    const s = await addStudent(w, { admission: "ZBHS/T/001", first: "Daniel", last: "Ade", classId: w.jss1.id })
    for (let i = 1; i <= 7; i++) await announce(w, `Notice ${i}`)
    await announce(w, "For JSS 1", { classId: w.jss1.id })
    await announce(w, "For SS 1", { classId: w.ss1.id })
    await announce(w, "Unpublished", { published: false })
    await announce(w, "Expired", { expires: days(-1) })

    const list = await loadStudentAnnouncements(s.id, NOW)
    expect(list).toHaveLength(8)
    expect(list.map((a) => a.title)).not.toContain("For SS 1")
    expect(list.map((a) => a.title)).not.toContain("Unpublished")
    expect(list.map((a) => a.title)).not.toContain("Expired")
    expect(list.find((a) => a.title === "For JSS 1")).toMatchObject({ category: "Class", className: "JSS 1" })
    expect(list.find((a) => a.title === "Notice 1")).toMatchObject({ category: "School-wide", className: null })
  })

  it("returns the full content, not a shortened excerpt", async () => {
    const w = await world()
    const s = await addStudent(w, { admission: "ZBHS/T/001", first: "Daniel", last: "Ade", classId: w.jss1.id })
    await db.announcement.create({
      data: { title: "Long", content: "word ".repeat(100).trim(), isPublished: true, publishedAt: days(-1), createdById: w.admin.id },
    })
    const [a] = await loadStudentAnnouncements(s.id, NOW)
    expect(a.content.length).toBe(499)
  })

  it("shows a student with no class only the school-wide ones", async () => {
    const w = await world()
    const s = await addStudent(w, { admission: "ZBHS/T/001", first: "Daniel", last: "Ade", classId: null })
    await announce(w, "School-wide")
    await announce(w, "For JSS 1", { classId: w.jss1.id })
    expect((await loadStudentAnnouncements(s.id, NOW)).map((a) => a.title)).toEqual(["School-wide"])
  })

  it("profile: returns only this student's own details with class and session, and no internal data", async () => {
    const w = await world()
    const s = await addStudent(w, { admission: "ZBHS/T/001", first: "Daniel", last: "Ade", classId: w.jss1.id })
    await addStudent(w, { admission: "ZBHS/T/002", first: "Grace", last: "Bello", classId: w.jss1.id })
    await db.user.update({ where: { id: s.userId }, data: { email: "daniel@example.test", phone: "08000000000" } })

    const profile = await loadStudentProfile(s.id)
    expect(profile).toEqual({
      firstName: "Daniel", lastName: "Ade", admissionNumber: "ZBHS/T/001", className: "JSS 1", section: null,
      sessionName: "2026/2027", email: "daniel@example.test", phone: "08000000000",
    })
    const text = JSON.stringify(profile)
    for (const forbidden of ["passwordHash", "Grace", "Bello", s.id, s.userId]) expect(text).not.toContain(forbidden)
  })

  it("profile: has empty contact details and no class when the school holds none", async () => {
    const w = await world()
    const s = await addStudent(w, { admission: "ZBHS/T/001", first: "Daniel", last: "Ade", classId: null })
    expect(await loadStudentProfile(s.id)).toMatchObject({ className: null, email: null, phone: null })
  })

  it("profile: returns null for an unknown student ID", async () => {
    expect(await loadStudentProfile("does-not-exist")).toBeNull()
  })
})
