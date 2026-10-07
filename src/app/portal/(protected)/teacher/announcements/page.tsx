import type { Metadata } from "next"

import { ComingSoon } from "@/components/student/coming-soon"
import { requireRole } from "@/lib/auth/current-user"

export const metadata: Metadata = { title: "Announcements" }

// Placeholder. It still enforces the role, and shows no data.
export default async function TeacherAnnouncementsPage() {
  await requireRole("TEACHER")
  return <ComingSoon title="Announcements" backHref="/portal/teacher" />
}
