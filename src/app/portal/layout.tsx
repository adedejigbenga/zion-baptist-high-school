import type { Metadata } from "next"

import { PortalBrandPanel } from "@/components/portal/portal-brand-panel"

export const metadata: Metadata = {
  title: { default: "School Portal", template: "%s | Zion Baptist High School" },
  description: "Sign in to the Zion Baptist High School portal.",
  robots: { index: false, follow: false },
}

/** Portal shell: persistent brand panel on the left, page content on the right. Separate from the public site layout. */
export default function PortalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-1 flex-col lg:flex-row">
      <a
        href="#main-content"
        className="sr-only z-50 rounded-lg bg-card px-4 py-2 type-label text-primary shadow-md focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:outline-2 focus:outline-offset-2 focus:outline-ring"
      >
        Skip to main content
      </a>
      <PortalBrandPanel />
      <main
        id="main-content"
        tabIndex={-1}
        className="flex flex-1 justify-center px-(--page-gutter) py-8 outline-none sm:py-10 lg:items-center lg:py-12"
      >
        <div className="w-full max-w-xl">{children}</div>
      </main>
    </div>
  )
}
