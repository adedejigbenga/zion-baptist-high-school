import { InfoIcon } from "lucide-react"

import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { TERM_LABEL, classLabel } from "@/lib/academic"
import { cn } from "@/lib/utils"
import type { StudentDashboard } from "@/types/student"

type SummaryProps = Pick<StudentDashboard, "student" | "academic" | "enrollment"> & { className?: string }

/** Student name, admission number, class, session and term: all read from the database for the signed-in student. */
function StudentSummaryCard({ student, academic, enrollment, className }: SummaryProps) {
  const rows: [string, string][] = [
    ["Name", `${student.firstName} ${student.lastName}`],
    ["Admission number", student.admissionNumber],
    ["Class", enrollment ? classLabel(enrollment.className, enrollment.section) : "Not enrolled"],
    ["Academic session", academic.sessionName ?? "Not set"],
    ["Current term", academic.termName ? TERM_LABEL[academic.termName] : "Not set"],
  ]

  return (
    <Card className={cn("h-fit", className)}>
      <CardHeader>
        <h2 className="type-card-title text-foreground">Student summary</h2>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <dl className="grid gap-x-8 gap-y-4 sm:grid-cols-2 xl:grid-cols-1 xl:gap-y-0 xl:divide-y xl:divide-border">
          {rows.map(([label, value]) => (
            <div key={label} className="flex flex-col gap-0.5 xl:py-3 xl:first:pt-0 xl:last:pb-0">
              <dt className="type-caption font-normal text-muted-foreground">{label}</dt>
              <dd className="type-label break-words text-foreground">{value}</dd>
            </div>
          ))}
        </dl>
        {!enrollment && (
          <p className="flex items-start gap-2 rounded-lg border border-brand-100 bg-surface-subtle p-3 type-body-sm text-muted-foreground">
            <InfoIcon className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
            You are not in a class for this session yet. Please contact the school office.
          </p>
        )}
      </CardContent>
    </Card>
  )
}

export { StudentSummaryCard }
