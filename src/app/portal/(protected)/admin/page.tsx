import type { Metadata } from "next"

import { SignedInWelcome } from "@/components/portal/signed-in-welcome"
import { requireRole } from "@/lib/auth/current-user"

export const metadata: Metadata = { title: "Admin Home" }

// TEMPORARY landing page until the admin dashboard is built.
export default async function AdminHomePage() {
  const user = await requireRole("ADMIN")
  return <SignedInWelcome user={user} />
}
