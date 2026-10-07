import type { Metadata } from "next"

import { PortalLogin } from "@/components/portal/portal-login"

export const metadata: Metadata = {
  title: "Admin Login",
}

// Visual prototype only: no authentication yet.
export default function AdminLoginPage() {
  return <PortalLogin roleId="admin" />
}
