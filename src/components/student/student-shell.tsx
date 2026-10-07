import * as React from "react"

import { BrandLogo } from "@/components/layout/brand-logo"
import { DashboardSkeleton } from "@/components/student/dashboard-skeleton"
import { StudentMobileNav } from "@/components/student/student-mobile-nav"
import { StudentNav } from "@/components/student/student-nav"
import { StudentSidebarProfile, StudentSidebarProfileSkeleton } from "@/components/student/student-sidebar-profile"

/**
 * Frame for every /portal/student page: sidebar from lg up, compact header with a menu below lg.
 * It is only a frame: it protects nothing. Each page and every data function checks the session itself
 * (layouts do not re-run on client-side navigation).
 */
function StudentShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh lg:flex print:block print:min-h-0">
      <a
        href="#main-content"
        className="sr-only z-50 rounded-lg bg-card px-4 py-2 type-label text-primary shadow-md print:hidden focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:outline-2 focus:outline-offset-2 focus:outline-ring"
      >
        Skip to main content
      </a>

      {/* Desktop sidebar */}
      <aside className="hidden print:hidden border-r border-sidebar-border bg-sidebar lg:sticky lg:top-0 lg:flex lg:h-dvh lg:w-72 lg:shrink-0 lg:flex-col lg:gap-6 lg:overflow-y-auto lg:p-5">
        <BrandLogo className="self-start" />
        <p className="type-caption font-semibold tracking-[0.14em] text-primary uppercase">Student Portal</p>
        <React.Suspense fallback={<StudentSidebarProfileSkeleton />}>
          <StudentSidebarProfile />
        </React.Suspense>
        <StudentNav />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col print:block">
        {/* Mobile / tablet header */}
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-3 border-b border-border bg-card/95 px-(--page-gutter) backdrop-blur lg:hidden print:hidden">
          <BrandLogo />
          <StudentMobileNav>
            <React.Suspense fallback={<StudentSidebarProfileSkeleton />}>
              <StudentSidebarProfile />
            </React.Suspense>
          </StudentMobileNav>
        </header>

        <main id="main-content" tabIndex={-1} className="flex-1 px-(--page-gutter) py-6 outline-none md:py-8 lg:px-10 lg:py-10 print:p-0">
          <div className="mx-auto w-full max-w-5xl print:max-w-none">
            <React.Suspense fallback={<DashboardSkeleton />}>{children}</React.Suspense>
          </div>
        </main>
      </div>
    </div>
  )
}

export { StudentShell }
