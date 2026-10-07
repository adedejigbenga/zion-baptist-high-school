import type { Metadata } from "next"

import { PortalLogin } from "@/components/portal/portal-login"

export const metadata: Metadata = {
  title: "Teacher Login",
}

export default function TeacherLoginPage() {
  return <PortalLogin roleId="teacher" />
}
