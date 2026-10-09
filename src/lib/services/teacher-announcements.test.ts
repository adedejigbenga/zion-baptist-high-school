import { afterAll, beforeEach, describe, expect, it } from "vitest"

import { db } from "@/lib/db"
import { loadTeacherAnnouncements } from "@/lib/services/teacher-announcements"
import { resetDatabase } from "@/test/helpers"
import { world } from "@/test/world"

const NOW = new Date("2026-10-07T12:00:00.000Z")
const days = (n: number) => new Date(NOW.getTime() + n * 24 * 60 * 60 * 1000)

beforeEach(resetDatabase)
afterAll(() => db.$disconnect())

async function announce(
  adminId: string,
  title: string,
  o: { published?: boolean; expires?: Date | null; at?: Date; classId?: string | null } = {},
) {
  return db.announcement.create({
    data: {
      title,
      content: `${title} body`,
      isPublished: o.published ?? true,
      publishedAt: o.at ?? days(-2),
      expiresAt: o.expires ?? null,
      targetClassId: o.classId ?? null,
      createdById: adminId,
    },
  })
}

describe("teacher announcements (read-only)", () => {
  it("shows school-wide announcements and those for the teacher's own classes only", async () => {
    const w = await world()
    await announce(w.admin.id, "School-wide")
    await announce(w.admin.id, "For JSS 1", { classId: w.jss1.id })
    await announce(w.admin.id, "For JSS 2", { classId: w.jss2.id })
    await announce(w.admin.id, "For SS 1", { classId: w.ss1.id })

    // Maths teacher: JSS 1 + JSS 2 this session (SS 1 was last session only). English teacher: JSS 1 + SS 1.
    const maths = (await loadTeacherAnnouncements(w.maths.actor.teacherId, NOW)).map((a) => a.title).sort()
    expect(maths).toEqual(["For JSS 1", "For JSS 2", "School-wide"])
    const english = (await loadTeacherAnnouncements(w.english.actor.teacherId, NOW)).map((a) => a.title).sort()
    expect(english).toEqual(["For JSS 1", "For SS 1", "School-wide"])
  })

  it("hides unpublished, expired and scheduled announcements", async () => {
    const w = await world()
    await announce(w.admin.id, "Live")
    await announce(w.admin.id, "Unpublished", { published: false })
    await announce(w.admin.id, "Expired", { expires: days(-1) })
    await announce(w.admin.id, "Scheduled", { at: days(10) })
    const titles = (await loadTeacherAnnouncements(w.maths.actor.teacherId, NOW)).map((a) => a.title)
    expect(titles).toEqual(["Live"])
  })

  it("respects the limit, newest first", async () => {
    const w = await world()
    for (let i = 1; i <= 5; i++) await announce(w.admin.id, `Notice ${i}`, { at: days(-10 + i) })
    const list = await loadTeacherAnnouncements(w.maths.actor.teacherId, NOW, 3)
    expect(list.map((a) => a.title)).toEqual(["Notice 5", "Notice 4", "Notice 3"])
  })

  it("labels class announcements with their class and returns only school-wide ones to an unassigned teacher", async () => {
    const w = await world()
    await announce(w.admin.id, "School-wide")
    await announce(w.admin.id, "For JSS 1", { classId: w.jss1.id })
    const user = await db.user.create({ data: { loginId: "teacher.new", passwordHash: "x", role: "TEACHER", firstName: "New", lastName: "Teacher" } })
    const fresh = await db.teacher.create({ data: { userId: user.id, employeeNumber: "T9" } })

    expect((await loadTeacherAnnouncements(fresh.id, NOW)).map((a) => a.title)).toEqual(["School-wide"])
    const forMaths = await loadTeacherAnnouncements(w.maths.actor.teacherId, NOW)
    expect(forMaths.find((a) => a.title === "For JSS 1")).toMatchObject({ category: "Class", className: "JSS 1" })
  })
})
