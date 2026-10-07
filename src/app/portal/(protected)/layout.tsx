import { PortalAppShell } from "@/components/portal/portal-app-shell"

/**
 * Signed-in area. This layout is only a frame: it does NOT protect anything. Layouts do not re-run on
 * client-side navigation, so every page and data function checks the session itself (requireRole).
 */
export default function ProtectedLayout({ children }: { children: React.ReactNode }) {
  return <PortalAppShell>{children}</PortalAppShell>
}
