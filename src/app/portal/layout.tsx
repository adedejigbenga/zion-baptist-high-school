import type { Metadata } from "next"

export const metadata: Metadata = {
  title: { default: "School Portal", template: "%s | Zion Baptist High School" },
  description: "Sign in to the Zion Baptist High School portal.",
  robots: { index: false, follow: false },
}

/** Shared by everything under /portal. The sign-in area and the signed-in area each add their own layout. */
export default function PortalLayout({ children }: { children: React.ReactNode }) {
  return children
}
