import { BookOpenIcon, CalendarDaysIcon } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import type { TermName } from "@/generated/prisma/enums"
import { TERM_LABEL } from "@/lib/academic"
import { greetingFor } from "@/lib/greeting"

type DashboardHeaderProps = {
  firstName: string
  /** Passed in (not read here) so the greeting uses one consistent moment for the whole page. */
  now: Date
  sessionName: string | null
  termName: TermName | null
}

/** "Good morning, Daniel" (school time), a welcome line, and the current session and term from the database. */
function DashboardHeader({ firstName, now, sessionName, termName }: DashboardHeaderProps) {
  return (
    <header className="flex flex-col gap-3">
      <div className="flex flex-col gap-1.5">
        <h1 className="type-page-title text-balance text-brand-950">
          {greetingFor(now)}, {firstName}
        </h1>
        <p className="type-body text-muted-foreground">Welcome to your student portal.</p>
      </div>
      <div className="flex flex-wrap gap-2">
        {sessionName && termName ? (
          <>
            <Badge variant="secondary">
              <CalendarDaysIcon aria-hidden="true" />
              Session {sessionName}
            </Badge>
            <Badge variant="secondary">
              <BookOpenIcon aria-hidden="true" />
              {TERM_LABEL[termName]}
            </Badge>
          </>
        ) : (
          <Badge variant="neutral">No current term has been set up yet</Badge>
        )}
      </div>
    </header>
  )
}

export { DashboardHeader }
