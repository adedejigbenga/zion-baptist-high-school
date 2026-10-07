import Link from "next/link"

import { BrandLogo } from "@/components/layout/brand-logo"
import { MainNav } from "@/components/layout/main-nav"
import { MobileNav } from "@/components/layout/mobile-nav"
import { buttonVariants } from "@/components/ui/button"
import { mainNav, siteConfig } from "@/lib/site-config"

/**
 * Public site header.
 * - lg and up: logo, links, "Visit the Portal"
 * - below lg: logo, hamburger (the portal button joins from sm up; on phones it lives in the menu and hero)
 */
function PublicHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/90 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="page-container flex h-16 items-center justify-between gap-4 lg:h-[4.5rem]">
        <BrandLogo />

        <nav aria-label="Main" className="hidden lg:block">
          <MainNav items={mainNav} />
        </nav>

        <div className="flex items-center gap-2">
          <div className="hidden sm:block">
            <Link href={siteConfig.portalHref} className={buttonVariants()}>
              Visit the Portal
            </Link>
          </div>
          <MobileNav />
        </div>
      </div>
    </header>
  )
}

export { PublicHeader }
