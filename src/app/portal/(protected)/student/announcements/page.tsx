import type { Metadata } from "next"

import { AnnouncementList } from "@/components/student/announcement-list"
import { getStudentAnnouncements } from "@/lib/services/student"

export const metadata: Metadata = { title: "Announcements" }

/** Announcements for the signed-in student only: school-wide ones plus those addressed to their own class. */
export default async function StudentAnnouncementsPage() {
  const announcements = await getStudentAnnouncements()
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
