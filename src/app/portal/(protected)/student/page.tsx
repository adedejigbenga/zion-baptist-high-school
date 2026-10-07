import type { Metadata } from "next"

import { SignedInWelcome } from "@/components/portal/signed-in-welcome"
import { requireRole } from "@/lib/auth/current-user"

export const metadata: Metadata = { title: "Student Home" }

// TEMPORARY landing page until the student dashboard is built.
export default async function StudentHomePage() {
  const user = await requireRole("STUDENT")
  return <SignedInWelcome user={user} />
}
