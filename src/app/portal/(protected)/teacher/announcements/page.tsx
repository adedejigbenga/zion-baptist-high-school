import type { Metadata } from "next"

import { AnnouncementList } from "@/components/student/announcement-list"
import { getTeacherAnnouncements } from "@/lib/services/teacher"

export const metadata: Metadata = { title: "Announcements" }

/** Read-only school announcements for the signed-in teacher: school-wide, plus those for the classes they teach. */
export default async function TeacherAnnouncementsPage() {
  const announcements = await getTeacherAnnouncements()
  return (
    <div className="stack-page">
      <div className="flex flex-col gap-1">
        <h1 className="type-page-title text-brand-950">Announcements</h1>
        <p className="type-body text-muted-foreground">News and notices from the school.</p>
      </div>
      <AnnouncementList announcements={announcements} now={new Date()} />
    </div>
  )
}
