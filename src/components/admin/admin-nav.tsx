"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  BookOpenIcon,
  CalendarRangeIcon,
  ClipboardListIcon,
  GraduationCapIcon,
  LayoutDashboardIcon,
  LogOutIcon,
  MegaphoneIcon,
  ScrollTextIcon,
  SchoolIcon,
  UserRoundCogIcon,
    type LucideIcon,
} from "lucide-react"
import { cn } from "cn"

import { signOut } from "@/lib/auth/actions"

const items: { href: string; label: string; icon: LucideIcon; exact?: boolean }[] = [
  { href: "/portal/admin", label: "Dashboard", icon: LayoutDashboardIcon, exact: true },
  { href: "/portal/admin/students", label: "Students", icon: GraduationCapIcon },
  { href: "/portal/admin/teachers", label: "Teachers", icon: UserRoundCogIcon },
  { href: "/portal/admin/classes", label: "Classes", icon: SchoolIcon },
  { href: "/portal/admin/subjects", label: "Subjects", icon: BookOpenIcon },
  { href: "/portal/admin/academics", label: "Academic Sessions", icon: CalendarRangeIcon },
  { href: "/portal/admin/results", label: "Results", icon: ClipboardListIcon },
  { href: "/portal/admin/announcements", label: "Announcements", icon: MegaphoneIcon },
  { href: "/portal/admin/audit-logs", label: "Audit Logs", icon: ScrollTextIcon },
]

const rowClass =
  "flex min-h-11 w-full items-center gap-3 rounded-lg px-3 type-label transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"

/** Sidebar / menu links for the admin portal, with the current page marked. Logout is a real form button. */
function AdminNav({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname()

  return (
    <nav aria-label="Admin portal">
      <ul className="flex flex-col gap-1">
        {items.map(({ href, label, icon: Icon, exact }) => {
          const active = exact ? pathname === href : pathname === href || pathname.startsWith(`${href}/`)
          return (
            <li key={href}>
              <Link
                href={href}
                onClick={onNavigate}
                aria-current={active ? "page" : undefined}
                className={cn(
                  rowClass,
                  active
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "text-sidebar-foreground hover:bg-muted"
                )}
              >
                <Icon className={cn("size-5 shrink-0", active ? "text-primary" : "text-muted-foreground")} aria-hidden="true" />
                {label}
                {active && <span className="ml-auto h-5 w-1 rounded-full bg-primary" aria-hidden="true" />}
              </Link>
            </li>
          )
        })}
        <li className="mt-2 border-t border-sidebar-border pt-3">
          <form action={signOut}>
            <button type="submit" className={cn(rowClass, "text-sidebar-foreground hover:bg-muted")}>
              <LogOutIcon className="size-5 shrink-0 text-muted-foreground" aria-hidden="true" />
              Logout
            </button>
          </form>
        </li>
      </ul>
    </nav>
  )
}

export { AdminNav }
