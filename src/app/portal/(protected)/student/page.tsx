import type { Metadata } from "next"

import { DashboardHeader } from "@/components/student/dashboard-header"
import { QuickActions } from "@/components/student/quick-actions"
import { RecentAnnouncements } from "@/components/student/recent-announcements"
import { ResultStatusCard } from "@/components/student/result-status-card"
import { StudentSummaryCard } from "@/components/student/student-summary-card"
import { getStudentDashboard } from "@/lib/services/student"

export const metadata: Metadata = { title: "Student Dashboard" }

/**
 * Student dashboard. The student is whoever is signed in: getStudentDashboard() takes no ID, so nothing in the URL
 * or the browser can select a different student. The result card only ever receives a status, never scores.
 */
export default async function StudentDashboardPage() {
  const { student, academic, enrollment, result, announcements } = await getStudentDashboard()
  const now = new Date()

  return (
    <div className="stack-page">
      <DashboardHeader firstName={student.firstName} now={now} sessionName={academic.sessionName} termName={academic.termName} />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_20rem]">
        <ResultStatusCard result={result} termName={academic.termName} sessionName={academic.sessionName} />
        <StudentSummaryCard student={student} academic={academic} enrollment={enrollment} className="xl:row-span-2" />
        <QuickActions resultAvailable={result.state === "PUBLISHED"} />
        <RecentAnnouncements announcements={announcements} className="xl:col-span-2" />
      </div>
    </div>
  )
}
