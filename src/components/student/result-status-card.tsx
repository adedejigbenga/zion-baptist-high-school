import Link from "next/link"
import { ArrowRightIcon, CheckCircle2Icon, ClockIcon, FileQuestionIcon, SchoolIcon } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { buttonVariants } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import type { TermName } from "@/generated/prisma/enums"
import { TERM_LABEL } from "@/lib/academic"
import { formatDate } from "@/lib/format"
import type { StudentResultStatus } from "@/types/student"

type ResultStatusCardProps = {
  result: StudentResultStatus
  termName: TermName | null
  sessionName: string | null
  className?: string
}

/**
 * The most prominent card on the dashboard. It receives ONLY a status (see StudentResultStatus): it has no way to
 * show scores, grades or totals, whatever state the result is in.
 */
function ResultStatusCard({ result, termName, sessionName, className }: ResultStatusCardProps) {
  const period = termName && sessionName ? `${TERM_LABEL[termName]}, ${sessionName}` : "this term"

  if (result.state === "PUBLISHED") {
    return (
      <Card variant="brand" className={className}>
        <div className="flex flex-col items-start gap-4 px-(--card-spacing)">
          <Badge variant="success">
            <CheckCircle2Icon aria-hidden="true" />
            Published
          </Badge>
          <div className="flex flex-col gap-2">
            <h2 className="type-section-title text-white">Your result is available</h2>
            <p className="type-body max-w-prose text-brand-100">
              Your result for {period} has been published
              {result.publishedAt ? ` on ${formatDate(result.publishedAt)}` : ""}.
            </p>
          </div>
          <Link href="/portal/student/results" className={buttonVariants({ variant: "inverse", size: "lg", className: "w-full sm:w-auto" })}>
            Check Result
            <ArrowRightIcon aria-hidden="true" />
          </Link>
        </div>
      </Card>
    )
  }

  if (result.state === "IN_PROGRESS") {
    return (
      <Card className={className}>
        <div className="flex flex-col items-start gap-4 px-(--card-spacing)">
          <Badge variant="warning">
            <ClockIcon aria-hidden="true" />
            Upload in Progress
          </Badge>
          <div className="flex flex-col gap-2">
            <h2 className="type-section-title text-brand-950">Result Upload in Progress</h2>
            <p className="type-body max-w-prose text-muted-foreground">
              Your result for {period} is still being prepared by your teachers, so it is not available yet.
              It will appear here as soon as it has been published.
            </p>
          </div>
        </div>
      </Card>
    )
  }

  const empty =
    result.state === "NO_ENROLLMENT"
      ? {
          icon: SchoolIcon,
          title: "No class for this session",
          text: "You have not been placed in a class for the current session, so there is no result to show. Please contact the school office.",
        }
      : result.state === "NO_TERM"
        ? {
            icon: FileQuestionIcon,
            title: "No active term",
            text: "The school has not set up the current term yet. Your result will be shown here once it has.",
          }
        : {
            icon: FileQuestionIcon,
            title: "No result yet",
            text: `Your result for ${period} has not been uploaded yet. Please check back later.`,
          }
  const Icon = empty.icon

  return (
    <Card variant="subtle" className={className}>
      <div className="flex items-start gap-4 px-(--card-spacing)">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-card text-primary shadow-xs ring-1 ring-brand-100">
          <Icon className="size-5" aria-hidden="true" />
        </span>
        <div className="flex flex-col gap-1.5">
          <h2 className="type-section-title text-brand-950">{empty.title}</h2>
          <p className="type-body max-w-prose text-muted-foreground">{empty.text}</p>
        </div>
      </div>
    </Card>
  )
}

export { ResultStatusCard }
