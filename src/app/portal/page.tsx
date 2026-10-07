import type { Metadata } from "next"

import { PortalGateway } from "@/components/portal/portal-gateway"

export const metadata: Metadata = {
  title: "Welcome to the School Portal",
}

export default function PortalPage() {
  return <PortalGateway />
}
