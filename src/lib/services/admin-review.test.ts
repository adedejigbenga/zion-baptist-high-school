import { afterAll, beforeEach, describe, expect, it } from "vitest"

import { db } from "@/lib/db"
import { loadAnnouncements, saveAnnouncement, setAnnouncementPublished } from "@/lib/services/admin-announcements"
import { loadAdminOverview } from "@/lib/services/admin-directory"
import { loadResultList, loadResultReview, publishResult, unpublishResult } from "@/lib/services/admin-results"
import { loadStudentResultView } from "@/lib/services/results"
import { loadStudentDashboard, loadStudentAnnouncements } from "@/lib/services/student-dashboard"
import { loadTeacherAnnouncements } from "@/lib/services/teacher-announcements"
import { saveSubjectResults } from "@/lib/services/teacher-results"
import { resetDatabase } from "@/test/helpers"
import { world } from "@/test/world"

beforeEach(resetDatabase)
afterAll(() => db.$disconnect())

const NOW = new Date("2026-10-07T12:00:00.000Z")
const day = (n: number) => new Date(NOW.getTime() + n * 86_400_000)
const iso = (d: Date) => new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Lagos" }).format(d)
const cells = (admission: string, ca: string, exam: string) => ({ [admission]: { CA: ca, Exam: exam } })
const both = (a: [string, string], b: [string, string]) => ({ ...cells("ZBHS/T/001", ...a), ...cells("ZBHS/T/002", ...b) })
const filters = (o: Partial<Parameters<typeof loadResultList>[0]> = {}) => ({ session: "2026-2027", term: "first", classKey: "", subject: "", status: "ALL", page: 1, ...o })

async function submitJss1(w: Awaited<ReturnType<typeof world>>) {
  await saveSubjectResults(w.maths.actor, { classKey: "jss-1", subjectCode: "MTH", intent: "submit", cells: both(["30", "50"], ["20", "40"]) })
  await saveSubjectResults(w.english.actor, { classKey: "jss-1", subjectCode: "ENG", intent: "submit", cells: both(["35", "55"], ["25", "45"]) })
}

describe("admin result review: list, filters, review screen", () => {
  it("lists submitted results with submission date and teachers, and filters by status, class, subject and teacher", async () => {
    const w = await world()
    await submitJss1(w)
    // Samuel (JSS 2) has only a draft in Maths.
    await saveSubjectResults(w.maths.actor, { classKey: "jss-2", subjectCode: "MTH", intent: "draft", cells: cells("ZBHS/T/003", "10", "20") })

    const all = await loadResultList(filters())
    expect(all.counts).toEqual({ DRAFT: 1, SUBMITTED: 2, PUBLISHED: 0 })
    const daniel = all.rows.find((r) => r.admissionNumber === "ZBHS/T/001")
    expect(daniel).toMatchObject({ status: "SUBMITTED", submittedSubjects: 2, requiredSubjects: 2 })
    expect(daniel?.submittedAt).toBeInstanceOf(Date)
    expect(daniel?.teachers.sort()).toEqual(["Nia Teacher".replace("Nia", "Ngozi"), "Peter Teacher"].sort())

    expect((await loadResultList(filters({ status: "SUBMITTED" }))).rows.map((r) => r.admissionNumber).sort()).toEqual(["ZBHS/T/001", "ZBHS/T/002"])
    expect((await loadResultList(filters({ classKey: "jss-2" }))).rows.map((r) => r.admissionNumber)).toEqual(["ZBHS/T/003"])

    const bySubject = await loadResultList(filters({ subject: "ENG" }))
    expect(bySubject.rows.map((r) => [r.admissionNumber, r.subjectStatus])).toEqual(expect.arrayContaining([["ZBHS/T/001", "SUBMITTED"]]))
    expect(bySubject.rows.find((r) => r.admissionNumber === "ZBHS/T/003")).toBeUndefined()
    expect(bySubject.rows[0].teachers).toEqual(["Ngozi Teacher"])

    // Teacher filter: the English teacher teaches JSS 1 and SS 1 only.
    const english = await loadResultList(filters({ teacher: "teacher.english" }))
    expect(english.rows.map((r) => r.admissionNumber).sort()).toEqual(["ZBHS/T/001", "ZBHS/T/002"])
    const maths = await loadResultList(filters({ teacher: "teacher.math" }))
    expect(maths.rows.map((r) => r.admissionNumber).sort()).toEqual(["ZBHS/T/001", "ZBHS/T/002", "ZBHS/T/003"])
    expect((await loadResultList(filters({ teacher: "nobody" }))).rows).toEqual([])
  })

  it("the review shows real recalculated scores, who teaches each subject, and when it was submitted", async () => {
    const w = await world()
    await submitJss1(w)
    const review = await loadResultReview("ZBHS/T/001", "2026-2027-first")
    expect(review?.status).toBe("SUBMITTED")
    expect(review?.completeness.complete).toBe(true)
    const mth = review?.completeness.subjects.find((s) => s.code === "MTH")
    expect(mth).toMatchObject({ total: 80, grade: "A", entryStatus: "SUBMITTED" }) // 30/40*40 + 50/60*60 = 80
    expect(review?.subjectMeta.MTH.teachers).toEqual(["Peter Teacher"])
    expect(review?.subjectMeta.ENG.submittedAt).toBeInstanceOf(Date)
    expect(review?.overall).toEqual({ total: 170, average: 85 })
  })

  it("does not trust stored totals: a tampered total makes the result unpublishable", async () => {
    const w = await world()
    await submitJss1(w)
    await db.resultEntry.updateMany({ where: { result: { studentId: w.daniel.id }, subject: { code: "MTH" } }, data: { totalScore: 99.99, grade: "A" } })
    expect((await loadResultReview("ZBHS/T/001", "2026-2027-first"))?.completeness.complete).toBe(false)
    expect(await publishResult({ userId: w.admin.id }, { admission: "ZBHS/T/001", termKey: "2026-2027-first" })).toMatchObject({ ok: false, code: "INCOMPLETE" })
    expect((await db.result.findFirstOrThrow({ where: { studentId: w.daniel.id } })).status).toBe("SUBMITTED")
  })

  it("the dashboard counts and queue show submitted results with the right numbers", async () => {
    const w = await world()
    await submitJss1(w)
    const before = await loadAdminOverview()
    expect(before.awaitingPublication).toBe(2)
    expect(before.publishedResults).toBe(0)
    expect(before.awaiting.map((r) => r.admissionNumber).sort()).toEqual(["ZBHS/T/001", "ZBHS/T/002"])
    expect(before.awaiting[0]).toMatchObject({ className: "JSS 1", termKey: "2026-2027-first" })

    await publishResult({ userId: w.admin.id }, { admission: "ZBHS/T/001", termKey: "2026-2027-first" })
    const after = await loadAdminOverview()
    expect([after.awaitingPublication, after.publishedResults]).toEqual([1, 1])
    expect(after.awaiting.map((r) => r.admissionNumber)).toEqual(["ZBHS/T/002"])
  })
})

describe("publish and unpublish: what students can and cannot retrieve", () => {
  it("a student sees scores only while the result is PUBLISHED, never in draft, submitted or after unpublishing", async () => {
    const w = await world()
    const admin = { userId: w.admin.id }
    const key = "2026-2027-first"
    const status = async () => (await loadStudentResultView(w.daniel.id, key, NOW)).kind

    await saveSubjectResults(w.maths.actor, { classKey: "jss-1", subjectCode: "MTH", intent: "draft", cells: cells("ZBHS/T/001", "30", "50") })
    expect(await status()).not.toBe("PUBLISHED")
    await submitJss1(w)
    const submitted = await loadStudentResultView(w.daniel.id, key, NOW)
    expect(submitted.kind).not.toBe("PUBLISHED")
    expect(JSON.stringify(submitted)).not.toMatch(/"total"|"grade"|"scores"/)
    expect(JSON.stringify(await loadStudentDashboard(w.daniel.id, NOW))).not.toContain("80")

    expect(await publishResult(admin, { admission: "ZBHS/T/001", termKey: key })).toMatchObject({ ok: true })
    const published = await loadStudentResultView(w.daniel.id, key, NOW)
    expect(published.kind).toBe("PUBLISHED")
    expect(JSON.stringify(published)).toContain("80")
    expect((await loadStudentDashboard(w.daniel.id, NOW))?.result.state).toBe("PUBLISHED")
    // Grace's result is still only submitted: her view of Daniel's term never leaks his, and hers shows nothing.
    expect((await loadStudentResultView(w.grace.id, key, NOW)).kind).not.toBe("PUBLISHED")

    expect(await unpublishResult(admin, { admission: "ZBHS/T/001", termKey: key, reason: "Checking a mark" })).toMatchObject({ ok: true })
    const hidden = await loadStudentResultView(w.daniel.id, key, NOW)
    expect(hidden.kind).not.toBe("PUBLISHED")
    expect(JSON.stringify(hidden)).not.toMatch(/"total"|"grade"|"scores"/)
    expect((await loadStudentDashboard(w.daniel.id, NOW))?.result.state).toBe("IN_PROGRESS")

    // Nothing was deleted, and the history shows both actions.
    expect(await db.resultEntryScore.count({ where: { resultEntry: { result: { studentId: w.daniel.id } } } })).toBe(4)
    expect((await db.resultPublication.findMany({ where: { result: { studentId: w.daniel.id } }, orderBy: { publishedAt: "asc" } })).map((p) => p.action)).toEqual(["PUBLISHED", "UNPUBLISHED"])
    expect(await db.auditLog.count({ where: { action: { in: ["RESULT_PUBLISHED", "RESULT_UNPUBLISHED"] } } })).toBe(2)
  })

  it("only an admin can publish or unpublish, and an incomplete result cannot be published", async () => {
    const w = await world()
    const key = "2026-2027-first"
    await saveSubjectResults(w.maths.actor, { classKey: "jss-1", subjectCode: "MTH", intent: "submit", cells: both(["30", "50"], ["20", "40"]) }) // English missing
    expect(await publishResult({ userId: w.admin.id }, { admission: "ZBHS/T/001", termKey: key })).toMatchObject({ ok: false })
    await submitJss1(w)
    expect(await publishResult({ userId: w.maths.user.id }, { admission: "ZBHS/T/001", termKey: key })).toMatchObject({ ok: false, code: "NOT_AUTHORIZED" })
    expect(await publishResult({ userId: w.daniel.userId }, { admission: "ZBHS/T/001", termKey: key })).toMatchObject({ ok: false, code: "NOT_AUTHORIZED" })
    expect(await unpublishResult({ userId: w.maths.user.id }, { admission: "ZBHS/T/001", termKey: key, reason: "no" })).toMatchObject({ ok: false })
    expect(await db.result.count({ where: { status: "PUBLISHED" } })).toBe(0)
  })
})

describe("announcements: scheduling, expiry, targeting, filters and visibility", () => {
  const base = { content: "Body text", target: "school", expires: "", publishOn: "" }
  const make = (admin: string, title: string, o: Partial<typeof base & { id: string }> = {}) => saveAnnouncement({ userId: admin }, { ...base, title, ...o }, NOW)

  it("rejects an expiry that is not after the publish date, and an invalid or past expiry", async () => {
    const w = await world()
    expect(await make(w.admin.id, "Bad", { publishOn: iso(day(10)), expires: iso(day(5)) })).toMatchObject({ ok: false, fieldErrors: { expires: expect.stringContaining("after the publish date") } })
    expect(await make(w.admin.id, "Past", { expires: iso(day(-2)) })).toMatchObject({ ok: false, fieldErrors: { expires: expect.any(String) } })
    expect(await make(w.admin.id, "Good", { publishOn: iso(day(5)), expires: iso(day(10)) })).toMatchObject({ ok: true })
    expect(await db.announcement.count()).toBe(1)
  })

  it("a draft is invisible; publishing makes it visible; a future publish date schedules it; unpublishing hides it again", async () => {
    const w = await world()
    const admin = { userId: w.admin.id }
    const visibleTo = async () => (await loadStudentAnnouncements(w.daniel.id, NOW)).map((a) => a.title)

    await make(w.admin.id, "Welcome back")
    const draft = await db.announcement.findFirstOrThrow({ where: { title: "Welcome back" } })
    expect(draft).toMatchObject({ isPublished: false, publishedAt: null })
    expect(await visibleTo()).toEqual([])
    expect(await setAnnouncementPublished(admin, draft.id, true, NOW)).toMatchObject({ ok: true })
    expect(await visibleTo()).toEqual(["Welcome back"])
    expect(await setAnnouncementPublished(admin, draft.id, false, NOW)).toMatchObject({ ok: true })
    expect(await visibleTo()).toEqual([])

    await make(w.admin.id, "Next week", { publishOn: iso(day(7)) })
    const planned = await db.announcement.findFirstOrThrow({ where: { title: "Next week" } })
    expect(await setAnnouncementPublished(admin, planned.id, true, NOW)).toMatchObject({ ok: true, message: expect.stringContaining("scheduled") })
    expect(await visibleTo()).toEqual([])
    expect((await loadStudentAnnouncements(w.daniel.id, day(8))).map((a) => a.title)).toEqual(["Next week"])
    expect((await loadAnnouncements(NOW)).find((a) => a.title === "Next week")?.state).toBe("SCHEDULED")
  })

  it("expired announcements disappear for students, and class-targeted ones reach only that class (and its teachers)", async () => {
    const w = await world()
    const admin = { userId: w.admin.id }
    await make(w.admin.id, "Whole school")
    await make(w.admin.id, "JSS 1 only", { target: "jss-1" })
    await make(w.admin.id, "SS 1 only", { target: "ss-1" })
    await make(w.admin.id, "Ends soon", { expires: iso(day(2)) })
    for (const a of await db.announcement.findMany()) await setAnnouncementPublished(admin, a.id, true, NOW)

    const titles = async (studentId: string, at = NOW) => (await loadStudentAnnouncements(studentId, at)).map((a) => a.title).sort()
    expect(await titles(w.daniel.id)).toEqual(["Ends soon", "JSS 1 only", "Whole school"]) // JSS 1 student
    expect(await titles(w.samuel.id)).toEqual(["Ends soon", "Whole school"]) // JSS 2 student
    expect(await titles(w.esther.id)).toEqual(["Ends soon", "SS 1 only", "Whole school"]) // SS 1 student
    expect(await titles(w.daniel.id, day(3))).toEqual(["JSS 1 only", "Whole school"]) // after expiry

    const teacher = async (id: string) => (await loadTeacherAnnouncements(id, NOW)).map((a) => a.title).sort()
    expect(await teacher(w.maths.actor.teacherId)).toEqual(["Ends soon", "JSS 1 only", "Whole school"]) // Maths: JSS 1 + JSS 2
    expect(await teacher(w.english.actor.teacherId)).toEqual(["Ends soon", "JSS 1 only", "SS 1 only", "Whole school"])
  })

  it("search and filters narrow the admin list, and every change is audited without secrets", async () => {
    const w = await world()
    const admin = { userId: w.admin.id }
    await make(w.admin.id, "Sports day", { content: "Bring your kit", target: "jss-1" })
    await make(w.admin.id, "Exam timetable", { content: "Published on the board" })
    const timetable = await db.announcement.findFirstOrThrow({ where: { title: "Exam timetable" } })
    await setAnnouncementPublished(admin, timetable.id, true, NOW)
    await saveAnnouncement(admin, { ...base, id: timetable.id, title: "Exam timetable (updated)", content: "New room" }, NOW)

    expect((await loadAnnouncements(NOW, { q: "kit" })).map((a) => a.title)).toEqual(["Sports day"])
    expect((await loadAnnouncements(NOW, { q: "timetable updated" })).map((a) => a.title)).toEqual(["Exam timetable (updated)"])
    expect((await loadAnnouncements(NOW, { state: "draft" })).map((a) => a.title)).toEqual(["Sports day"])
    expect((await loadAnnouncements(NOW, { state: "live" })).map((a) => a.title)).toEqual(["Exam timetable (updated)"])
    expect((await loadAnnouncements(NOW, { target: "jss-1" })).map((a) => a.title)).toEqual(["Sports day"])
    expect((await loadAnnouncements(NOW, { target: "school" })).map((a) => a.title)).toEqual(["Exam timetable (updated)"])

    const actions = (await db.auditLog.findMany({ where: { entityType: "Announcement" }, select: { action: true } })).map((a) => a.action).sort()
    expect(actions).toEqual(["ANNOUNCEMENT_CREATED", "ANNOUNCEMENT_CREATED", "ANNOUNCEMENT_PUBLISHED", "ANNOUNCEMENT_UPDATED"])
    expect(JSON.stringify(await db.auditLog.findMany({ select: { metadata: true } }))).not.toMatch(/password|hash|token/i)
  })

  it("only an admin can create, edit, publish or unpublish", async () => {
    const w = await world()
    expect(await make(w.maths.user.id, "Sneaky")).toMatchObject({ ok: false })
    await make(w.admin.id, "Real")
    const real = await db.announcement.findFirstOrThrow()
    expect(await setAnnouncementPublished({ userId: w.daniel.userId }, real.id, true, NOW)).toMatchObject({ ok: false })
    expect((await db.announcement.findFirstOrThrow()).isPublished).toBe(false)
    expect(await db.announcement.count()).toBe(1)
  })
})
