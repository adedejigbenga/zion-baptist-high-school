"use client"

import * as React from "react"
import Link from "next/link"
import { ArrowRightIcon, MenuIcon } from "lucide-react"

import { BrandLogo } from "@/components/layout/brand-logo"
import { MainNav } from "@/components/layout/main-nav"
import { Button, buttonVariants } from "@/components/ui/button"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { mainNav, siteConfig } from "@/lib/site-config"

/** Hamburger menu shown below the lg breakpoint. Closes itself when a link is chosen. */
function MobileNav() {
  const [open, setOpen] = React.useState(false)

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        render={
          <Button variant="outline" size="icon" aria-label="Open menu" className="lg:hidden" />
        }
      >
        <MenuIcon aria-hidden="true" />
      </SheetTrigger>
      <SheetContent side="right" className="w-[min(22rem,88vw)] gap-0 p-0 sm:max-w-sm">
        <SheetHeader className="border-b border-border px-5 py-4">
          <SheetTitle className="sr-only">Menu</SheetTitle>
          <SheetDescription className="sr-only">Site navigation for {siteConfig.name}</SheetDescription>
          <BrandLogo asLink={false} />
        </SheetHeader>
        <nav aria-label="Mobile" className="flex-1 overflow-y-auto px-3 py-4">
          <MainNav items={mainNav} orientation="vertical" onNavigate={() => setOpen(false)} />
        </nav>
        <div className="border-t border-border p-5">
          <Link
            href={siteConfig.portalHref}
            onClick={() => setOpen(false)}
            className={buttonVariants({ size: "lg", className: "w-full" })}
          >
            Visit the Portal
            <ArrowRightIcon aria-hidden="true" />
          </Link>
        </div>
      </SheetContent>
    </Sheet>
  )
}

export { MobileNav }
