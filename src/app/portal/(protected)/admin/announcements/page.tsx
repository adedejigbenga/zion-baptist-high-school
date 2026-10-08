import type { Metadata } from "next"

import { AnnouncementsManager } from "@/components/admin/announcements-manager"
import { PageHeader } from "@/components/admin/common"
import { getAnnouncements } from "@/lib/services/admin"

export const metadata: Metadata = { title: "Announcements" }

export default async function AdminAnnouncementsPage() {
  const { announcements, targets } = await getAnnouncements()
  return (
    <div className="stack-page">
      <PageHeader title="Announcements" description="Create, edit and publish notices for the whole school or one class." />
      <AnnouncementsManager announcements={announcements} targets={targets} />
    </div>
  )
}
