import Link from "next/link"
import { ArrowRightIcon, LockKeyholeIcon } from "lucide-react"

import { buttonVariants } from "@/components/ui/button"
import { siteConfig } from "@/lib/site-config"

function PortalCta() {
  return (
    <section aria-labelledby="portal-heading" className="page-container pb-16 md:pb-20 lg:pb-24">
      <div className="relative isolate overflow-hidden rounded-xl bg-brand-gradient px-6 py-10 shadow-md sm:px-10 sm:py-12 lg:px-16 lg:py-16">
        {/* decorative rings */}
        <div aria-hidden="true" className="absolute -top-24 -right-16 -z-10 size-72 rounded-full border border-white/15" />
        <div aria-hidden="true" className="absolute -top-8 -right-0 -z-10 size-48 rounded-full border border-white/10" />
        <div aria-hidden="true" className="absolute -bottom-28 left-1/3 -z-10 size-64 rounded-full bg-white/5" />

        <div className="grid items-center gap-8 md:grid-cols-[1fr_auto] md:gap-12">
          <div className="flex max-w-2xl flex-col gap-4">
            <span className="flex size-11 items-center justify-center rounded-lg bg-white/15 text-white">
              <LockKeyholeIcon className="size-5" aria-hidden="true" />
            </span>
            <h2 id="portal-heading" className="type-section-title text-balance text-white md:text-[1.75rem] lg:text-[2.25rem]">
              Access the School Portal
            </h2>
            <p className="type-body text-pretty text-brand-100">
              Students and teachers can securely access their academic information and school activities through
              the portal.
            </p>
          </div>

          <Link
            href={siteConfig.portalHref}
            className={buttonVariants({ variant: "inverse", size: "lg", className: "w-full md:w-auto" })}
          >
            Visit the Portal
            <ArrowRightIcon aria-hidden="true" />
          </Link>
        </div>
      </div>
    </section>
  )
}

export { PortalCta }
