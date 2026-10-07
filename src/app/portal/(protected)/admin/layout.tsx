import { PortalAppShell } from "@/components/portal/portal-app-shell"

/** TEMPORARY frame until this role's real dashboard shell is built. Protects nothing by itself. */
export default function RoleLayout({ children }: { children: React.ReactNode }) {
  return <PortalAppShell>{children}</PortalAppShell>
}
