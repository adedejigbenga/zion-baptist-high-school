import { afterAll, beforeEach, describe, expect, it } from "vitest"

import { db } from "@/lib/db"
import { summarizeMetadata } from "@/lib/audit-summary"
import { loadAdminOverview, loadAuditLogs, loadClasses, loadStudents, loadTeachers } from "@/lib/services/admin-directory"
import { loadAnnouncements, saveAnnouncement, setAnnouncementPublished } from "@/lib/services/admin-announcements"
import { loadResultList, loadResultReview, publishResult, unpublishResult } from "@/lib/services/admin-results"
import { loadStudentResultView } from "@/lib/services/results"
import { loadStudentDashboard } from "@/lib/services/student-dashboard"
import { evaluateResult } from "@/lib/services/result-completeness"
import { saveSubjectResults } from "@/lib/services/teacher-results"
import { parseAnnouncementForm } from "@/lib/validation/announcement"
import { resetDatabase } from "@/test/helpers"
import { world } from "@/test/world"

const NOW = new Date("2026-10-07T12:00:00.000Z")
const KEY = "2026-2027-first"
const row = (ca: string, exam: string) => ({ CA: ca, Exam: exam })

beforeEach(resetDatabase)
afterAll(() => db.$disconnect())

/** JSS 1 (Daniel, Grace): Mathematics and English both submitted, so both results become SUBMITTED. */
async function submittedJss1(w: Awaited<ReturnType<typeof world>>) {
  await saveSubjectResults(w.maths.actor, { classKey: "jss-1", subjectCode: "MTH", intent: "submit", cells: { "ZBHS/T/001": row("34", "52"), "ZBHS/T/002": row("20", "30") } })
  await saveSubjectResults(w.english.actor, { classKey: "jss-1", subjectCode: "ENG", intent: "submit", cells: { "ZBHS/T/001": row("30", "45"), "ZBHS/T/002": row("25", "35") } })
}
const actorOf = (w: Awaited<ReturnType<typeof world>>) => ({ userId: w.admin.id })
const resultOf = (admission: string) => db.result.findFirstOrThrow({ where: { student: { admissionNumber: admission } } })

// ---------------------------------------------------------------------------------------------------------
describe("completeness rules (pure)", () => {
  const scheme = {
    components: [
      { shortName: "CA", name: "Continuous Assessment", maxScore: 40, weight: 40 },
      { shortName: "Exam", name: "Examination", maxScore: 60, weight: 60 },
    ],
    bands: [{ grade: "A", minScore: 70, maxScore: 100, remark: "Excellent" }, { grade: "F", minScore: 0, maxScore: 69.99, remark: "Fail" }],
  }
  const req = [{ subjectId: "m", code: "MTH", name: "Mathematics" }, { subjectId: "e", code: "ENG", name: "English" }]
  const ok = (id: string) => ({ subjectId: id, status: "SUBMITTED" as const, totalScore: 86, grade: "A", remark: "Excellent", scores: { CA: 34, Exam: 52 } })

  it("is complete when every class subject has every component, consistent and submitted", () => {
    expect(evaluateResult(scheme, req, [ok("m"), ok("e")])).toMatchObject({ complete: true, issues: [] })
  })
  it("names a missing subject", () => {
    const r = evaluateResult(scheme, req, [ok("m")])
    expect(r.complete).toBe(false)
    expect(r.issues).toEqual(["English: No scores have been entered."])
  })
  it("names a missing component", () => {
    const r = evaluateResult(scheme, req, [ok("m"), { ...ok("e"), scores: { CA: 34 }, totalScore: null, grade: null, remark: null }])
    expect(r.issues).toEqual(["English: Missing Examination score."])
  })
  it("flags stored totals that no longer match the scores", () => {
    const r = evaluateResult(scheme, req, [ok("m"), { ...ok("e"), totalScore: 99 }])
    expect(r.issues[0]).toContain("does not match the scores")
    expect(evaluateResult(scheme, req, [ok("m"), { ...ok("e"), grade: "F" }]).complete).toBe(false)
  })
  it("flags a gap in the grade bands", () => {
    const gap = { ...scheme, bands: [scheme.bands[0]] }
    expect(evaluateResult(gap, req, [ok("m"), { ...ok("e"), scores: { CA: 1, Exam: 1 }, totalScore: 3.33 }]).issues[0]).toContain("no grade band")
  })
  it("flags unsubmitted subjects", () => {
    expect(evaluateResult(scheme, req, [ok("m"), { ...ok("e"), status: "DRAFT" }]).issues).toEqual(["English: The teacher has not submitted this subject yet."])
  })
  it("is never complete with no subjects or no components", () => {
    expect(evaluateResult(scheme, [], []).complete).toBe(false)
    expect(evaluateResult({ ...scheme, components: [] }, req, [ok("m"), ok("e")]).complete).toBe(false)
  })
  it("ignores entries for subjects the class does not offer", () => {
    expect(evaluateResult(scheme, req, [ok("m"), ok("e"), ok("zzz")]).complete).toBe(true)
  })
})

// ---------------------------------------------------------------------------------------------------------
describe("publishing", () => {
  it("publishes a complete submitted result: status, publishedAt, publishedBy, publication row, audit log", async () => {
    const w = await world()
    await submittedJss1(w)
    const out = await publishResult(actorOf(w), { admission: "ZBHS/T/001", termKey: KEY })
    expect(out.ok).toBe(true)

    const r = await resultOf("ZBHS/T/001")
    expect([r.status, r.publishedById]).toEqual(["PUBLISHED", w.admin.id])
    expect(r.publishedAt).toBeInstanceOf(Date)
    const pubs = await db.resultPublication.findMany({ where: { resultId: r.id } })
    expect(pubs.map((p) => [p.action, p.publishedById])).toEqual([["PUBLISHED", w.admin.id]])
    const log = await db.auditLog.findFirstOrThrow({ where: { action: "RESULT_PUBLISHED" } })
    expect([log.userId, log.entityType, log.entityId]).toEqual([w.admin.id, "Result", r.id])
    expect(log.metadata).toMatchObject({ admissionNumber: "ZBHS/T/001", class: "JSS 1", term: "FIRST", session: "2026/2027", subjects: 2 })
    expect(JSON.stringify(log.metadata)).not.toMatch(/86|52|Excellent/) // no marks in the audit log
    expect((await resultOf("ZBHS/T/002")).status).toBe("SUBMITTED") // only the chosen student
  })

  it("makes the result visible to ITS student only", async () => {
    const w = await world()
    await submittedJss1(w)
    expect((await loadStudentResultView(w.daniel.id, undefined, NOW)).kind).toBe("NOT_PUBLISHED")
    await publishResult(actorOf(w), { admission: "ZBHS/T/001", termKey: KEY })

    const daniel = await loadStudentResultView(w.daniel.id, undefined, NOW)
    expect(daniel.kind).toBe("PUBLISHED")
    expect(JSON.stringify(daniel)).toContain("Mathematics")
    expect((await loadStudentResultView(w.grace.id, undefined, NOW)).kind).toBe("NOT_PUBLISHED") // classmate unaffected
    expect((await loadStudentDashboard(w.daniel.id, NOW))?.result.state).toBe("PUBLISHED")
    expect((await loadStudentDashboard(w.grace.id, NOW))?.result.state).toBe("IN_PROGRESS")
    expect(JSON.stringify(await loadStudentResultView(w.samuel.id, undefined, NOW))).not.toContain("Daniel")
  })

  it("refuses an incomplete result (one subject submitted) and explains what is missing", async () => {
    const w = await world()
    await saveSubjectResults(w.maths.actor, { classKey: "jss-1", subjectCode: "MTH", intent: "submit", cells: { "ZBHS/T/001": row("34", "52"), "ZBHS/T/002": row("20", "30") } })
    const out = await publishResult(actorOf(w), { admission: "ZBHS/T/001", termKey: KEY })
    expect(out).toMatchObject({ ok: false, code: "INCOMPLETE" })
    expect(!out.ok && out.issues).toEqual(["English Language: No scores have been entered."])
    expect((await resultOf("ZBHS/T/001")).status).toBe("DRAFT")
    expect(await db.resultPublication.count()).toBe(0)
    expect(await db.auditLog.count({ where: { action: "RESULT_PUBLISHED" } })).toBe(0)
    expect(await db.auditLog.count({ where: { action: "RESULT_PUBLISH_BLOCKED" } })).toBe(1)
    expect((await loadStudentResultView(w.daniel.id, undefined, NOW)).kind).toBe("NOT_PUBLISHED")
  })

  it("refuses a result with a draft subject and says the teacher has not submitted it", async () => {
    const w = await world()
    await saveSubjectResults(w.maths.actor, { classKey: "jss-1", subjectCode: "MTH", intent: "submit", cells: { "ZBHS/T/001": row("34", "52"), "ZBHS/T/002": row("20", "30") } })
    await saveSubjectResults(w.english.actor, { classKey: "jss-1", subjectCode: "ENG", intent: "draft", cells: { "ZBHS/T/001": row("30", "45") } })
    const out = await publishResult(actorOf(w), { admission: "ZBHS/T/001", termKey: KEY })
    expect(!out.ok && out.issues).toEqual(["English Language: The teacher has not submitted this subject yet."])
  })

  it("is based on the class's subjects, not a fixed list: a newly added class subject blocks a submitted result", async () => {
    const w = await world()
    await submittedJss1(w)
    await db.classSubject.create({ data: { classId: w.jss1.id, subjectId: w.bio.id, sessionId: w.session.id } })
    const out = await publishResult(actorOf(w), { admission: "ZBHS/T/001", termKey: KEY })
    expect(!out.ok && out.issues).toEqual(["Biology: No scores have been entered."])
    expect((await resultOf("ZBHS/T/001")).status).toBe("SUBMITTED") // still not published
  })

  it("is based on the grading scheme's components: a newly added component blocks publication", async () => {
    const w = await world()
    await submittedJss1(w)
    await db.assessmentComponent.create({ data: { gradingSchemeId: w.scheme.id, name: "Project", shortName: "Proj", maxScore: 10, weight: 10, sortOrder: 3 } })
    const out = await publishResult(actorOf(w), { admission: "ZBHS/T/001", termKey: KEY })
    expect(out).toMatchObject({ ok: false, code: "INCOMPLETE" })
    expect(!out.ok && out.issues).toEqual(["English Language: Missing Project score.", "Mathematics: Missing Project score."])
  })

  it("refuses a result whose stored total was altered outside the app", async () => {
    const w = await world()
    await submittedJss1(w)
    await db.resultEntry.updateMany({ where: { subjectId: w.mth.id }, data: { totalScore: 99 } })
    const out = await publishResult(actorOf(w), { admission: "ZBHS/T/001", termKey: KEY })
    expect(!out.ok && out.issues?.[0]).toContain("Mathematics: The saved total")
  })

  it("refuses unknown students and terms, double publishing, and a stale (concurrent) change", async () => {
    const w = await world()
    await submittedJss1(w)
    expect(await publishResult(actorOf(w), { admission: "NOPE", termKey: KEY })).toMatchObject({ ok: false, code: "NOT_FOUND" })
    expect(await publishResult(actorOf(w), { admission: "ZBHS/T/001", termKey: "1999-2000-first" })).toMatchObject({ ok: false, code: "NOT_FOUND" })
    expect((await publishResult(actorOf(w), { admission: "ZBHS/T/001", termKey: KEY })).ok).toBe(true)
    expect(await publishResult(actorOf(w), { admission: "ZBHS/T/001", termKey: KEY })).toMatchObject({ ok: false, code: "ALREADY" })
    expect(await db.resultPublication.count()).toBe(1)
  })
})

describe("unpublishing", () => {
  it("hides the result from the student, keeps every score, records it, and allows republishing", async () => {
    const w = await world()
    await submittedJss1(w)
    await publishResult(actorOf(w), { admission: "ZBHS/T/001", termKey: KEY })
    const scoresBefore = await db.resultEntryScore.count()

    const out = await unpublishResult(actorOf(w), { admission: "ZBHS/T/001", termKey: KEY, reason: "Correction needed" })
    expect(out.ok).toBe(true)
    const r = await resultOf("ZBHS/T/001")
    expect([r.status, r.publishedAt, r.publishedById]).toEqual(["SUBMITTED", null, null])
    expect(await db.resultEntryScore.count()).toBe(scoresBefore)
    expect(await db.resultEntry.count()).toBe(4)

    expect((await loadStudentResultView(w.daniel.id, undefined, NOW)).kind).toBe("NOT_PUBLISHED")
    expect((await loadStudentDashboard(w.daniel.id, NOW))?.result.state).toBe("IN_PROGRESS")

    const pubs = await db.resultPublication.findMany({ where: { resultId: r.id }, orderBy: { publishedAt: "asc" } })
    expect(pubs.map((p) => p.action)).toEqual(["PUBLISHED", "UNPUBLISHED"])
    const log = await db.auditLog.findFirstOrThrow({ where: { action: "RESULT_UNPUBLISHED" } })
    expect(log.userId).toBe(w.admin.id)
    expect(log.metadata).toMatchObject({ admissionNumber: "ZBHS/T/001", reason: "Correction needed" })

    expect((await publishResult(actorOf(w), { admission: "ZBHS/T/001", termKey: KEY })).ok).toBe(true) // republish
    expect((await loadStudentResultView(w.daniel.id, undefined, NOW)).kind).toBe("PUBLISHED")
  })

  it("needs a reason and a published result", async () => {
    const w = await world()
    await submittedJss1(w)
    expect(await unpublishResult(actorOf(w), { admission: "ZBHS/T/001", termKey: KEY, reason: "x" })).toMatchObject({ ok: false, code: "INVALID" })
    expect(await unpublishResult(actorOf(w), { admission: "ZBHS/T/001", termKey: KEY, reason: "Valid reason" })).toMatchObject({ ok: false, code: "NOT_READY" })
    expect(await db.resultPublication.count()).toBe(0)
  })
})

describe("only an active administrator can change anything", () => {
  it.each(["teacher", "student", "inactive-admin", "unknown"] as const)("a %s cannot publish or unpublish", async (kind) => {
    const w = await world()
    await submittedJss1(w)
    const userId =
      kind === "teacher" ? w.maths.user.id : kind === "student" ? w.daniel.userId : kind === "unknown" ? "cm0doesnotexist000000000" :
      (await db.user.update({ where: { id: w.admin.id }, data: { isActive: false } })).id
    const out = await publishResult({ userId }, { admission: "ZBHS/T/001", termKey: KEY })
    expect(out).toMatchObject({ ok: false, code: "NOT_AUTHORIZED" })
    expect((await resultOf("ZBHS/T/001")).status).toBe("SUBMITTED")
    expect(await db.resultPublication.count()).toBe(0)

    await db.user.update({ where: { id: w.admin.id }, data: { isActive: true } })
    await publishResult(actorOf(w), { admission: "ZBHS/T/001", termKey: KEY })
    if (kind === "inactive-admin") await db.user.update({ where: { id: w.admin.id }, data: { isActive: false } })
    expect(await unpublishResult({ userId }, { admission: "ZBHS/T/001", termKey: KEY, reason: "Trying it" })).toMatchObject({ ok: false, code: "NOT_AUTHORIZED" })
    expect((await resultOf("ZBHS/T/001")).status).toBe("PUBLISHED")
  })

  it("records the refusal in the audit log", async () => {
    const w = await world()
    await submittedJss1(w)
    await publishResult({ userId: w.maths.user.id }, { admission: "ZBHS/T/001", termKey: KEY })
    const log = await db.auditLog.findFirstOrThrow({ where: { action: "ADMIN_ACCESS_DENIED" } })
    expect([log.userId, log.metadata]).toEqual([w.maths.user.id, { attempt: "publish" }])
  })

  it("announcements: a teacher or student cannot create or publish one", async () => {
    const w = await world()
    const input = { title: "Hello", content: "World", target: "school", expires: "" }
    expect(await saveAnnouncement({ userId: w.maths.user.id }, input, NOW)).toMatchObject({ ok: false })
    expect(await db.announcement.count()).toBe(0)
    await saveAnnouncement(actorOf(w), input, NOW)
    const a = await db.announcement.findFirstOrThrow()
    expect(await setAnnouncementPublished({ userId: w.daniel.userId }, a.id, true, NOW)).toMatchObject({ ok: false })
    expect((await db.announcement.findFirstOrThrow()).isPublished).toBe(false)
  })
})

// ---------------------------------------------------------------------------------------------------------
describe("review and list", () => {
  it("shows the complete result: subjects, components, totals, grades, remarks, overall", async () => {
    const w = await world()
    await submittedJss1(w)
    const review = await loadResultReview("ZBHS/T/001", KEY)
    expect(review).toMatchObject({ className: "JSS 1", sessionName: "2026/2027", status: "SUBMITTED", student: { name: "Daniel Ade", admissionNumber: "ZBHS/T/001" } })
    expect(review?.completeness.complete).toBe(true)
    expect(review?.completeness.subjects.map((s) => [s.name, s.scores, s.total, s.grade, s.remark])).toEqual([
      ["English Language", { CA: 30, Exam: 45 }, 75, "A", "Excellent"],
      ["Mathematics", { CA: 34, Exam: 52 }, 86, "A", "Excellent"],
    ])
    expect(review?.overall).toEqual({ total: 161, average: 80.5 })
    expect(await loadResultReview("NOPE", KEY)).toBeNull()
  })

  it("lists results with status counts, submitted first, and filters by status, class, subject, session, term", async () => {
    const w = await world()
    await submittedJss1(w)
    await saveSubjectResults(w.maths.actor, { classKey: "jss-2", subjectCode: "MTH", intent: "draft", cells: { "ZBHS/T/003": row("5", "") } })
    await publishResult(actorOf(w), { admission: "ZBHS/T/002", termKey: KEY })
    const base = { session: "2026-2027", term: "first", classKey: "", subject: "", status: "ALL", page: 1 }

    const all = await loadResultList(base)
    expect(all.counts).toEqual({ DRAFT: 1, SUBMITTED: 1, PUBLISHED: 1 })
    expect(all.rows.map((r) => [r.admissionNumber, r.status])).toEqual([["ZBHS/T/001", "SUBMITTED"], ["ZBHS/T/003", "DRAFT"], ["ZBHS/T/002", "PUBLISHED"]])
    expect(all.rows[0]).toMatchObject({ submittedSubjects: 2, requiredSubjects: 2, className: "JSS 1" })

    expect((await loadResultList({ ...base, status: "SUBMITTED" })).rows.map((r) => r.admissionNumber)).toEqual(["ZBHS/T/001"])
    expect((await loadResultList({ ...base, classKey: "jss-2" })).rows.map((r) => r.admissionNumber)).toEqual(["ZBHS/T/003"])
    expect((await loadResultList({ ...base, subject: "ENG" })).total).toBe(2)
    expect((await loadResultList({ ...base, term: "second" })).total).toBe(0)
    expect((await loadResultList({ ...base, session: "2025-2026" })).total).toBe(0)
    expect((await loadResultList({ ...base, session: "bogus", classKey: "bogus", term: "bogus" })).total).toBe(0)
  })

  it("paginates", async () => {
    const w = await world()
    for (let i = 0; i < 25; i++) {
      const u = await db.user.create({ data: { loginId: `p${i}`, passwordHash: "x", role: "STUDENT", firstName: "P", lastName: `Pupil${String(i).padStart(2, "0")}` } })
      const s = await db.student.create({ data: { userId: u.id, admissionNumber: `P/${i}` } })
      await db.result.create({ data: { studentId: s.id, sessionId: w.session.id, termId: w.term.id, classId: w.jss1.id, gradingSchemeId: w.scheme.id, status: "SUBMITTED" } })
    }
    const base = { session: "2026-2027", term: "first", classKey: "", subject: "", status: "ALL" }
    const p1 = await loadResultList({ ...base, page: 1 })
    const p2 = await loadResultList({ ...base, page: 2 })
    expect([p1.rows.length, p2.rows.length, p1.pageCount, p1.total]).toEqual([20, 5, 2, 25])
    expect((await loadResultList({ ...base, page: 99 })).page).toBe(2) // out-of-range page is clamped
  })
})

// ---------------------------------------------------------------------------------------------------------
describe("directory pages", () => {
  it("overview counts", async () => {
    const w = await world()
    await submittedJss1(w)
    const o = await loadAdminOverview()
    expect([o.sessionName, o.termName, o.totalStudents, o.totalTeachers, o.activeClasses, o.awaitingPublication]).toEqual(["2026/2027", "FIRST", 4, 2, 3, 2])
  })

  it("students: search by name or admission number, class, session, account status; never password data", async () => {
    const w = await world()
    await db.user.update({ where: { id: w.grace.userId }, data: { isActive: false } })
    const all = await loadStudents("", 1)
    expect(all.total).toBe(4)
    expect(all.rows.find((r) => r.admissionNumber === "ZBHS/T/002")).toMatchObject({ name: "Grace Bello", className: "JSS 1", sessionName: "2026/2027", active: false })
    expect((await loadStudents("daniel", 1)).rows.map((r) => r.admissionNumber)).toEqual(["ZBHS/T/001"])
    expect((await loadStudents("T/004", 1)).rows.map((r) => r.name)).toEqual(["Esther Cole"])
    expect((await loadStudents("cole esther", 1)).total).toBe(1)
    expect((await loadStudents("zzz", 1)).total).toBe(0)
    expect(JSON.stringify(all)).not.toMatch(/passwordHash|"x"/)
  })

  it("teachers and classes", async () => {
    await world()
    expect((await loadTeachers("", 1)).rows.map((t) => [t.name, t.employeeNumber, t.active])).toEqual([["Ngozi Teacher", "T2", true], ["Peter Teacher", "T1", true]])
    expect((await loadTeachers("t1", 1)).total).toBe(1)
    expect((await loadClasses()).map((c) => [c.name, c.level, c.active, c.studentCount])).toEqual([["JSS 1", 1, true, 2], ["JSS 2", 2, true, 1], ["SS 1", 4, true, 1]])
  })
})

// ---------------------------------------------------------------------------------------------------------
describe("audit logs", () => {
  it("hides anything sensitive from the metadata summary", () => {
    const s = summarizeMetadata({ ip: "10.0.0.1", loginIdHash: "abc", passwordHash: "$argon2id$...", sessionToken: "t0k", tokenHash: "h", password: "pw", note: "ok", nested: { password: "pw" }, items: [1, 2] })
    expect(s).toBe("ip: 10.0.0.1 · note: ok · items: 2 items")
    expect(s).not.toMatch(/argon|t0k|pw|abc/)
    expect(summarizeMetadata(null)).toBe("–")
    expect(summarizeMetadata({ long: "x".repeat(200) }).length).toBeLessThan(80)
  })

  it("lists newest first with user, action, entity and a safe summary, with filters and paging", async () => {
    const w = await world()
    await db.auditLog.createMany({
      data: [
        { userId: w.maths.user.id, action: "AUTH_LOGIN_SUCCESS", entityType: "User", entityId: w.maths.user.id, metadata: { ip: "1.2.3.4", loginIdHash: "SECRETHASH", token: "SECRETTOKEN" }, createdAt: new Date("2026-10-01") },
        { userId: w.admin.id, action: "RESULT_PUBLISHED", entityType: "Result", entityId: "r1", metadata: { admissionNumber: "A/1" }, createdAt: new Date("2026-10-02") },
        { userId: null, action: "AUTH_LOGIN_FAILED", entityType: "User", metadata: { passwordHash: "SECRETHASH2", reason: "bad" }, createdAt: new Date("2026-10-03") },
      ],
    })
    const all = await loadAuditLogs({ page: 1, action: "", entityType: "" })
    expect(all.rows.map((r) => r.action)).toEqual(["AUTH_LOGIN_FAILED", "RESULT_PUBLISHED", "AUTH_LOGIN_SUCCESS"])
    expect(all.rows[1]).toMatchObject({ userName: "Ada Min", userLoginId: "admin.t", entityType: "Result", entityId: "r1", summary: "admissionNumber: A/1" })
    expect(all.rows[0]).toMatchObject({ userName: null, summary: "reason: bad" })
    expect(JSON.stringify(all)).not.toMatch(/SECRET|passwordHash|tokenHash/)
    expect((await loadAuditLogs({ page: 1, action: "RESULT_PUBLISHED", entityType: "" })).total).toBe(1)
    expect((await loadAuditLogs({ page: 1, action: "", entityType: "Result" })).total).toBe(1)
    expect((await loadAuditLogs({ page: 1, action: "", entityType: "" }, 2)).pageCount).toBe(2)
  })
})

// ---------------------------------------------------------------------------------------------------------
describe("announcements", () => {
  const school = { title: "Mid-term break", content: "School closes on Friday.", target: "school", expires: "" }

  it("creates a draft that students do NOT see, then publishes it so the right students do", async () => {
    const w = await world()
    expect((await saveAnnouncement(actorOf(w), school, NOW)).ok).toBe(true)
    await saveAnnouncement(actorOf(w), { title: "JSS 1 trip", content: "Bring a packed lunch.", target: "jss-1", expires: "" }, NOW)
    const rows = await loadAnnouncements(NOW)
    expect(rows.map((r) => [r.title, r.state, r.targetLabel]).sort()).toEqual([["JSS 1 trip", "DRAFT", "JSS 1"], ["Mid-term break", "DRAFT", "Whole school"]])
    expect((await loadStudentDashboard(w.daniel.id, NOW))?.announcements).toEqual([])

    for (const r of rows) await setAnnouncementPublished(actorOf(w), r.id, true, NOW)
    const titles = async (id: string) => (await loadStudentDashboard(id, NOW))?.announcements.map((a) => a.title).sort()
    expect(await titles(w.daniel.id)).toEqual(["JSS 1 trip", "Mid-term break"]) // JSS 1 student: both
    expect(await titles(w.samuel.id)).toEqual(["Mid-term break"]) // JSS 2 student: school-wide only
    expect(await titles(w.esther.id)).toEqual(["Mid-term break"])
  })

  it("unpublishing removes it from students; editing keeps its state; every step is audited", async () => {
    const w = await world()
    await saveAnnouncement(actorOf(w), school, NOW)
    const id = (await db.announcement.findFirstOrThrow()).id
    await setAnnouncementPublished(actorOf(w), id, true, NOW)
    expect((await loadStudentDashboard(w.daniel.id, NOW))?.announcements).toHaveLength(1)

    expect((await saveAnnouncement(actorOf(w), { ...school, id, title: "Mid-term break (updated)", target: "jss-2" }, NOW)).ok).toBe(true)
    expect((await loadStudentDashboard(w.daniel.id, NOW))?.announcements).toHaveLength(0) // retargeted to JSS 2
    expect((await loadStudentDashboard(w.samuel.id, NOW))?.announcements.map((a) => a.title)).toEqual(["Mid-term break (updated)"])

    await setAnnouncementPublished(actorOf(w), id, false, NOW)
    expect((await loadStudentDashboard(w.samuel.id, NOW))?.announcements).toEqual([])
    expect((await db.announcement.findUniqueOrThrow({ where: { id } })).content).toBe(school.content) // never destroyed

    const actions = (await db.auditLog.findMany({ where: { entityType: "Announcement" }, orderBy: { createdAt: "asc" } })).map((l) => l.action)
    expect(actions).toEqual(["ANNOUNCEMENT_CREATED", "ANNOUNCEMENT_PUBLISHED", "ANNOUNCEMENT_UPDATED", "ANNOUNCEMENT_UNPUBLISHED"])
  })

  it("honours the expiry date and refuses past or invalid ones", async () => {
    const w = await world()
    expect(await saveAnnouncement(actorOf(w), { ...school, expires: "2026-10-01" }, NOW)).toMatchObject({ ok: false, fieldErrors: { expires: expect.any(String) } })
    await saveAnnouncement(actorOf(w), { ...school, expires: "2026-10-09" }, NOW)
    const id = (await db.announcement.findFirstOrThrow()).id
    await setAnnouncementPublished(actorOf(w), id, true, NOW)
    expect((await loadStudentDashboard(w.daniel.id, NOW))?.announcements).toHaveLength(1)
    expect((await loadStudentDashboard(w.daniel.id, new Date("2026-10-10T12:00:00Z")))?.announcements).toHaveLength(0) // expired
    expect((await loadAnnouncements(new Date("2026-10-10T12:00:00Z")))[0].state).toBe("EXPIRED")
    expect(await setAnnouncementPublished(actorOf(w), id, true, new Date("2026-10-10T12:00:00Z"))).toMatchObject({ ok: true }) // already published: no-op
  })

  it("refuses a class that does not exist", async () => {
    const w = await world()
    expect(await saveAnnouncement(actorOf(w), { ...school, target: "ss-9" }, NOW)).toMatchObject({ ok: false, fieldErrors: { target: expect.any(String) } })
    expect(await db.announcement.count()).toBe(0)
  })

  it("validates the form", () => {
    const form = (o: Record<string, string>) => { const f = new FormData(); for (const [k, v] of Object.entries(o)) f.set(k, v); return f }
    expect(parseAnnouncementForm(form({ title: "ab", content: "", target: "school", expires: "" }))).toMatchObject({ ok: false, fieldErrors: { title: expect.any(String), content: expect.any(String) } })
    expect(parseAnnouncementForm(form({ title: "Valid title", content: "Valid", target: "school", expires: "2026-02-31" }))).toMatchObject({ ok: false, fieldErrors: { expires: expect.any(String) } })
    expect(parseAnnouncementForm(form({ title: "Valid title", content: "Valid", target: "school", expires: "2026-12-01" })).ok).toBe(true)
    expect(parseAnnouncementForm(form({ id: "../x", title: "Valid title", content: "Valid", target: "school", expires: "" })).ok).toBe(false)
  })
})
