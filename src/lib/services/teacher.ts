import "server-only"

import { cache } from "react"
import { redirect } from "next/navigation"

import { requireRole } from "@/lib/auth/current-user"
import { loadTeacherAnnouncements } from "@/lib/services/teacher-announcements"
import { loadTeacherOverview, loadTeacherProfileSummary, loadWorkspace } from "@/lib/services/teacher-workspace"
import type { StudentAnnouncementItem } from "@/types/student"
import type { TeacherOverview, TeacherWorkspace } from "@/types/teacher"

/**
 * Teacher-facing data. NONE of these functions accepts a teacher ID, class ID, subject ID or student ID:
 *
 *   1. requireRole("TEACHER") validates the session against the database (signed out / wrong role -> redirect)
 *   2. the teacher profile ID comes from that validated session
 *   3. the browser may only name a class by key ("jss-1") and a subject by code ("MTH"); the server matches those
 *      against THIS teacher's TeacherAssignment rows and refuses anything else
 *
 * Memoised per request, so the layout (sidebar) and the page share one set of queries.
 */

async function currentTeacher() {
  const user = await requireRole("TEACHER")
  // A TEACHER session always has a Teacher profile (the session check refuses inconsistent accounts), but never assume.
  if (!user.teacherId) redirect("/portal")
  return { teacherId: user.teacherId, userId: user.id }
}

export const getTeacherProfileSummary = cache(async () => {
  const { teacherId } = await currentTeacher()
  const profile = await loadTeacherProfileSummary(teacherId)
  if (!profile) redirect("/portal")
  return profile
})

export const getTeacherOverview = cache(async (): Promise<TeacherOverview> => {
  const { teacherId } = await currentTeacher()
  return loadTeacherOverview(teacherId)
})

/** The results workspace for `classKey` + `subjectCode` (both optional; missing = the teacher's first assignment). */
export const getTeacherWorkspace = cache(
  async (classKey: string | undefined, subjectCode: string | undefined, query: string | undefined): Promise<TeacherWorkspace> => {
    const actor = await currentTeacher()
    return loadWorkspace(actor, { classKey, subjectCode, query })
  },
)

/** Read-only announcements for the signed-in teacher (school-wide plus their own classes). `limit` caps the list. */
export const getTeacherAnnouncements = cache(async (limit?: number): Promise<StudentAnnouncementItem[]> => {
  const { teacherId } = await currentTeacher()
  return loadTeacherAnnouncements(teacherId, new Date(), limit)
})
