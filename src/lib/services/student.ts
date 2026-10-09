import "server-only"

import { cache } from "react"
import { redirect } from "next/navigation"

import { requireRole } from "@/lib/auth/current-user"
import { loadStudentResultView } from "@/lib/services/results"
import { loadStudentAnnouncements, loadStudentDashboard, loadStudentProfile, loadStudentProfileSummary } from "@/lib/services/student-dashboard"
import type { StudentResultView } from "@/types/results"
import type { StudentAnnouncementItem, StudentDashboard, StudentProfile, StudentProfileSummary, StudentResultStatus } from "@/types/student"

/**
 * Student-facing data. NONE of these functions accepts a student ID: the student is always the one who is signed in.
 *
 *   1. requireRole("STUDENT") validates the session against the database (not signed in / wrong role -> redirect)
 *   2. the student profile ID comes from that validated session
 *   3. the queries are filtered by that ID, so there is no input a browser could change to see someone else's data
 *
 * Memoised per request, so the layout (sidebar) and the page share one set of queries.
 */

async function currentStudentId(): Promise<string> {
  const user = await requireRole("STUDENT")
  // A STUDENT session always has a Student profile (the session check refuses inconsistent accounts), but never assume.
  if (!user.studentId) redirect("/portal")
  return user.studentId
}

export const getStudentProfileSummary = cache(async (): Promise<StudentProfileSummary> => {
  const profile = await loadStudentProfileSummary(await currentStudentId())
  if (!profile) redirect("/portal")
  return profile
})

export const getStudentDashboard = cache(async (): Promise<StudentDashboard> => {
  const studentId = await currentStudentId()
  const dashboard = await loadStudentDashboard(studentId, new Date())
  if (!dashboard) redirect("/portal")
  return dashboard
})

/**
 * The student result page. `termKey` (from the URL, optional) can only choose among THIS student's own terms; it is
 * never a student identifier. Only a PUBLISHED result ever contains marks (see results.ts).
 */
export const getStudentResultView = cache(async (termKey: string | undefined): Promise<StudentResultView> => {
  const studentId = await currentStudentId()
  return loadStudentResultView(studentId, termKey, new Date())
})

/** The signed-in student (name + admission number). Same as getStudentProfileSummary; the name the spec uses. */
export const getCurrentStudent = getStudentProfileSummary

/** The signed-in student's full profile page data. */
export const getStudentProfile = cache(async (): Promise<StudentProfile> => {
  const profile = await loadStudentProfile(await currentStudentId())
  if (!profile) redirect("/portal")
  return profile
})

/** All announcements this student may see (school-wide + their own class; published, live, not expired). */
export const getStudentAnnouncements = cache(async (): Promise<StudentAnnouncementItem[]> => {
  return loadStudentAnnouncements(await currentStudentId(), new Date())
})

/** Only the status of the current result (never marks). Shares the dashboard's per-request query. */
export const getStudentResultStatus = cache(async (): Promise<StudentResultStatus> => {
  return (await getStudentDashboard()).result
})
