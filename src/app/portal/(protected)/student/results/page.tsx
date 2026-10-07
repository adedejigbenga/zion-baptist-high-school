import type { Metadata } from "next"

import { ComingSoon } from "@/components/student/coming-soon"
import { requireRole } from "@/lib/auth/current-user"

export const metadata: Metadata = { title: "My Results" }

// TEMPORARY placeholder. It still enforces the role, and shows no data.
export default async function StudentMyResultsPage() {
  await requireRole("STUDENT")
  return <ComingSoon title="My Results" />
}
