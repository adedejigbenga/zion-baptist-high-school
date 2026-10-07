import type { Metadata } from "next"

import { PortalLogin } from "@/components/portal/portal-login"

export const metadata: Metadata = {
  title: "Student Login",
}

// Visual prototype only: no authentication yet.
export default function StudentLoginPage() {
  return <PortalLogin roleId="student" />
}
