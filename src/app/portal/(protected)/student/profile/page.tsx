import type { Metadata } from "next"

import { ComingSoon } from "@/components/student/coming-soon"
import { requireRole } from "@/lib/auth/current-user"

export const metadata: Metadata = { title: "Profile" }

// TEMPORARY placeholder. It still enforces the role, and shows no data.
export default async function StudentProfilePage() {
  await requireRole("STUDENT")
  return <ComingSoon title="Profile" />
}
