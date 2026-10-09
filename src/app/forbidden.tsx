import type { Metadata } from "next"
import Link from "next/link"
import { ShieldAlertIcon } from "lucide-react"

import { BrandLogo } from "@/components/layout/brand-logo"
import { buttonVariants } from "@/components/ui/button"

export const metadata: Metadata = { title: "Access Denied" }

/**
 * Shown when a signed-in user opens a portal area that belongs to another role (for example a student opening the
 * admin portal). It says what happened and reveals nothing about the page: no data, no hint of what is there.
 */
export default function Forbidden() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-6 bg-background px-(--page-gutter) py-12 text-center">
      <BrandLogo />
      <span className="flex size-14 items-center justify-center rounded-xl bg-brand-100 text-primary">
        <ShieldAlertIcon className="size-7" aria-hidden="true" />
      </span>
      <div className="flex max-w-md flex-col gap-2">
        <p className="type-caption font-semibold tracking-[0.14em] text-primary uppercase">Error 403</p>
        <h1 className="type-page-title text-brand-950">Access Denied</h1>
        <p className="type-body text-muted-foreground">
          Your account does not have permission to open this page. If you think this is a mistake, please contact the
          school office.
        </p>
      </div>
      <div className="flex w-full max-w-xs flex-col gap-3 sm:max-w-none sm:flex-row sm:justify-center">
        <Link href="/portal" className={buttonVariants({ size: "lg" })}>
          Go to my portal
        </Link>
        <Link href="/" className={buttonVariants({ variant: "outline", size: "lg" })}>
          Back to the website
        </Link>
      </div>
    </main>
  )
}
