import Link from "next/link"
import { LockKeyholeIcon } from "lucide-react"

import { BrandLogo } from "@/components/layout/brand-logo"
import { InfoBar } from "@/components/layout/info-bar"
import { MainNav } from "@/components/layout/main-nav"
import { MobileNav } from "@/components/layout/mobile-nav"
import { buttonVariants } from "@/components/ui/button"
import { mainNav, siteConfig } from "@/lib/site-config"

/**
 * Public site header: a slim information bar (scrolls away) above the sticky main bar.
 * - xl and up: logo, the eight links, Portal button
 * - below xl: logo, Portal button (from sm), hamburger menu
 */
function PublicHeader() {
  return (
    <>
      <InfoBar />
      <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/85">
        <div className="page-container flex h-16 items-center justify-between gap-4 xl:h-[4.5rem]">
          <BrandLogo />

          <nav aria-label="Main" className="hidden xl:block">
            <MainNav items={mainNav} />
          </nav>

          <div className="flex items-center gap-2">
            <div className="hidden sm:block">
              <Link href={siteConfig.portalHref} className={buttonVariants()}>
                <LockKeyholeIcon aria-hidden="true" />
                Portal
              </Link>
            </div>
            <MobileNav />
          </div>
        </div>
      </header>
    </>
  )
}

export { PublicHeader }
