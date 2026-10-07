import "server-only"

import { cache } from "react"
import { redirect } from "next/navigation"

import { requireRole } from "@/lib/auth/current-user"
import { loadStudentDashboard, loadStudentProfileSummary } from "@/lib/services/student-dashboard"
import type { StudentDashboard, StudentProfileSummary } from "@/types/student"

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
