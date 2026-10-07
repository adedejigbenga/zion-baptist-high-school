import { ClockIcon, SchoolIcon } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"

/**
 * Shown for any selected term that has no PUBLISHED result (still a draft, awaiting review, or nothing yet).
 * Draft, submitted and "nothing yet" all look identical on purpose, and this component receives no marks at all.
 */
function ResultNotPublished({ termLabel }: { termLabel: string }) {
  return (
    <Card>
      <div className="flex flex-col items-start gap-4 px-(--card-spacing)">
        <Badge variant="warning">
          <ClockIcon aria-hidden="true" />
          Upload in Progress
        </Badge>
        <div className="flex flex-col gap-2">
          <h2 className="type-section-title text-brand-950">Result Upload in Progress</h2>
          <p className="type-body max-w-prose text-muted-foreground">
            Your result for this term has not been published yet. Please check back later.
          </p>
          <p className="type-caption font-normal text-muted-foreground">{termLabel}</p>
        </div>
      </div>
    </Card>
  )
}

function NoTermsCard() {
  return (
    <Card variant="subtle">
      <div className="flex items-start gap-4 px-(--card-spacing)">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-card text-primary shadow-xs ring-1 ring-brand-100">
          <SchoolIcon className="size-5" aria-hidden="true" />
        </span>
        <div className="flex flex-col gap-1.5">
          <h2 className="type-section-title text-brand-950">No results to show yet</h2>
          <p className="type-body max-w-prose text-muted-foreground">
            You are not in a class for any session yet, so there are no terms to show. Please contact the school office.
          </p>
        </div>
      </div>
    </Card>
  )
}

export { NoTermsCard, ResultNotPublished }
