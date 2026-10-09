import Link from "next/link"
import { ArrowRightIcon, ClipboardCheckIcon, MegaphoneIcon, PhoneIcon, UserRoundIcon, type LucideIcon } from "lucide-react"

import { Card } from "@/components/ui/card"
import { cn } from "@/lib/utils"

type QuickActionsProps = {
  /** Only a PUBLISHED result may be opened. */
  resultAvailable: boolean
  className?: string
}

function ActionLink({ href, icon: Icon, title, text }: { href: string; icon: LucideIcon; title: string; text: string }) {
  return (
    <Card interactive size="sm" className="h-full gap-3">
      <div className="flex flex-col gap-3 px-(--card-spacing)">
        <span className="flex size-10 items-center justify-center rounded-lg bg-brand-100 text-primary">
          <Icon className="size-5" aria-hidden="true" />
        </span>
        <div className="flex flex-col gap-1">
          <h3 className="type-card-title text-foreground">
            {/* Stretched link: the whole card is clickable, with a single tab stop */}
            <Link
              href={href}
              className="inline-flex items-center gap-1.5 rounded-sm outline-hidden after:absolute after:inset-0 after:content-['']"
            >
              {title}
              <ArrowRightIcon className="size-4 text-primary" aria-hidden="true" />
            </Link>
          </h3>
          <p className="type-body-sm text-muted-foreground">{text}</p>
        </div>
      </div>
    </Card>
  )
}

/** Shortcuts. "Check Result" is a link only when a published result exists; otherwise it is plain, explained text. */
function QuickActions({ resultAvailable, className }: QuickActionsProps) {
  return (
    <section aria-labelledby="quick-actions-heading" className={cn("flex flex-col gap-3", className)}>
      <h2 id="quick-actions-heading" className="type-card-title text-foreground">
        Quick actions
      </h2>
      <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <li className="flex">
          <div className="w-full">
            <ActionLink
              href="/portal/student/results"
              icon={ClipboardCheckIcon}
              title="View My Results"
              text={resultAvailable ? "Open your published result." : "See the status of your result."}
            />
          </div>
        </li>
        <li className="flex">
          <div className="w-full">
            <ActionLink href="/portal/student/profile" icon={UserRoundIcon} title="My Profile" text="See your student details." />
          </div>
        </li>
        <li className="flex">
          <div className="w-full">
            <ActionLink href="/portal/student/announcements" icon={MegaphoneIcon} title="Announcements" text="Read news from the school." />
          </div>
        </li>
        <li className="flex">
          <div className="w-full">
            <ActionLink href="/contact" icon={PhoneIcon} title="Contact School" text="Reach the school office." />
          </div>
        </li>
      </ul>
    </section>
  )
}

export { QuickActions }
