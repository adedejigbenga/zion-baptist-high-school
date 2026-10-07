"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "cn"

import type { NavItem } from "@/lib/site-config"

type MainNavProps = {
  items: readonly NavItem[]
  orientation?: "horizontal" | "vertical"
  /** Called when a link is chosen (used to close the mobile menu). */
  onNavigate?: () => void
  className?: string
}

function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`)
}

/** Public-site link list. Marks the current page with aria-current and a visible indicator. */
function MainNav({ items, orientation = "horizontal", onNavigate, className }: MainNavProps) {
  const pathname = usePathname()
  const vertical = orientation === "vertical"

  return (
    <ul className={cn("flex", vertical ? "flex-col gap-1" : "items-center gap-1", className)}>
      {items.map((item) => {
        const active = isActive(pathname, item.href)
        return (
          <li key={item.href}>
            <Link
              href={item.href}
              onClick={onNavigate}
              aria-current={active ? "page" : undefined}
              className={cn(
                "relative flex items-center rounded-lg type-label transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
                vertical ? "min-h-12 px-3 text-base" : "h-10 px-3",
                active
                  ? "text-primary"
                  : "text-foreground hover:bg-muted hover:text-primary",
                active && vertical && "bg-secondary text-secondary-foreground",
                // Desktop: purple underline marks the current page (not colour alone)
                !vertical &&
                  "after:absolute after:inset-x-3 after:-bottom-px after:h-0.5 after:rounded-full after:bg-primary after:opacity-0 after:transition-opacity",
                !vertical && active && "after:opacity-100"
              )}
            >
              {item.label}
            </Link>
          </li>
        )
      })}
    </ul>
  )
}

export { MainNav }
