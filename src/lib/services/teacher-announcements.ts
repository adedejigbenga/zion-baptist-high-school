import "server-only"

import { db } from "@/lib/db"
import type { StudentAnnouncementItem } from "@/types/student"

/**
 * INTERNAL. Read-only announcements for ONE teacher whose ID the caller has taken from the server-side session.
 * Pages call getTeacherAnnouncements() in ./teacher.ts, which takes no ID. Teachers can read announcements but
 * cannot create, edit or publish them (that is an administrator action in admin-announcements.ts).
 *
 * A teacher sees what is published, already live and not expired, and either school-wide or addressed to a class
 * they are assigned to in the current session.
 */
export async function loadTeacherAnnouncements(teacherId: string, now: Date, limit = 50): Promise<StudentAnnouncementItem[]> {
  const session = await db.academicSession.findFirst({ where: { isCurrent: true }, select: { id: true } })
  const assigned = session
    ? await db.teacherAssignment.findMany({
        where: { teacherId, sessionId: session.id },
        select: { classId: true },
        distinct: ["classId"],
      })
    : []
  const classIds = assigned.map((a) => a.classId)

  const rows = await db.announcement.findMany({
    where: {
      isPublished: true,
      AND: [
        { OR: [{ publishedAt: null }, { publishedAt: { lte: now } }] },
        { OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] },
        { OR: [{ targetClassId: null }, { targetClassId: { in: classIds } }] },
      ],
    },
    orderBy: [{ publishedAt: { sort: "desc", nulls: "last" } }, { createdAt: "desc" }],
    take: limit,
    select: { title: true, content: true, publishedAt: true, expiresAt: true, targetClass: { select: { name: true } } },
  })

  return rows.map((a) => ({
    title: a.title,
    content: a.content,
    publishedAt: a.publishedAt,
    expiresAt: a.expiresAt,
    category: a.targetClass ? ("Class" as const) : ("School-wide" as const),
    className: a.targetClass?.name ?? null,
  }))
}
