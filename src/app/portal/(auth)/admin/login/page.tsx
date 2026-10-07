import type { Metadata } from "next"

import { PortalLogin } from "@/components/portal/portal-login"

export const metadata: Metadata = {
  title: "Admin Login",
}

export default function AdminLoginPage() {
  return <PortalLogin roleId="admin" />
}
