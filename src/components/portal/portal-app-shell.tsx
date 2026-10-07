import * as React from "react"

import { BrandLogo } from "@/components/layout/brand-logo"
import { SignOutButton } from "@/components/portal/sign-out-button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { getCurrentUser } from "@/lib/auth/current-user"

const ROLE_LABEL = { STUDENT: "Student", TEACHER: "Teacher", ADMIN: "Administrator" } as const

/** Who is signed in. Reads the session, so it streams in behind <Suspense>. */
async function CurrentUserBadge() {
  const user = await getCurrentUser()
  if (!user) return null
  return (
    <div className="flex items-center gap-3">
      <span className="hidden type-label text-foreground sm:inline">
        {user.firstName} {user.lastName}
      </span>
      <Badge variant="secondary">{ROLE_LABEL[user.role]}</Badge>
    </div>
  )
}

/**
 * TEMPORARY minimal frame for the signed-in area (header with the user's name and a sign-out button).
 * It is replaced by the real dashboard shell (sidebar, header, breadcrumbs) when the dashboards are built.
 */
function PortalAppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-1 flex-col">
      <header className="border-b border-border bg-card">
        <div className="page-container flex h-16 items-center justify-between gap-4">
          <BrandLogo />
          <div className="flex items-center gap-3">
            <React.Suspense fallback={<Skeleton className="h-6 w-28" />}>
              <CurrentUserBadge />
            </React.Suspense>
            <SignOutButton />
          </div>
        </div>
      </header>
      <main id="main-content" className="page-container flex-1 py-10">
        <React.Suspense fallback={<Skeleton className="h-40 w-full max-w-xl" />}>{children}</React.Suspense>
      </main>
    </div>
  )
}

export { PortalAppShell }
