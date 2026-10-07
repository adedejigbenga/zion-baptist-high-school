import type { Metadata } from "next"

import { SignedInWelcome } from "@/components/portal/signed-in-welcome"
import { requireRole } from "@/lib/auth/current-user"

export const metadata: Metadata = { title: "Teacher Home" }

// TEMPORARY landing page until the teacher dashboard is built.
export default async function TeacherHomePage() {
  const user = await requireRole("TEACHER")
  return <SignedInWelcome user={user} />
}
