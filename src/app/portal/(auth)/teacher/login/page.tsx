import type { Metadata } from "next"

import { PortalLogin } from "@/components/portal/portal-login"

export const metadata: Metadata = {
  title: "Teacher Login",
}

// Visual prototype only: no authentication yet.
export default function TeacherLoginPage() {
  return <PortalLogin roleId="teacher" />
}
