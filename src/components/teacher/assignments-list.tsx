import Link from "next/link"
import { ArrowRightIcon, UsersIcon } from "lucide-react"

import { AssignmentStatusBadge } from "@/components/teacher/status-badges"
import { Card, CardContent } from "@/components/ui/card"
import type { TeacherAssignmentSummary } from "@/types/teacher"

/** The teacher's own class/subject assignments with progress. Each row links to the results workspace by key. */
function AssignmentsList({ assignments }: { assignments: TeacherAssignmentSummary[] }) {
  if (assignments.length === 0) {
    return (
      <Card variant="subtle">
        <CardContent className="flex flex-col items-center gap-3 py-6 text-center">
          <UsersIcon className="size-8 text-primary" aria-hidden="true" />
          <h2 className="type-card-title text-foreground">No classes assigned yet</h2>
          <p className="max-w-md type-body-sm text-muted-foreground">
            You have not been assigned a class and subject for this session. Please contact the school administrator.
          </p>
        </CardContent>
      </Card>
    )
  }
  return (
    <ul className="grid gap-4 md:grid-cols-2">
      {assignments.map((a) => (
        <li key={`${a.classKey}:${a.subjectCode}`}>
          <Card size="sm" className="h-full">
            <CardContent className="flex h-full flex-col gap-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <h3 className="type-card-title text-foreground">{a.className}</h3>
                  <p className="type-body-sm text-muted-foreground">{a.subjectName}</p>
                </div>
                <AssignmentStatusBadge status={a.status} />
              </div>
              <dl className="grid grid-cols-4 gap-2 text-center">
                {(
                  [
                    ["Students", a.studentCount],
                    ["Not started", a.notStarted],
                    ["Drafts", a.drafts],
                    ["Submitted", a.submitted + a.published],
                  ] as const
                ).map(([label, n]) => (
                  <div key={label} className="rounded-lg bg-surface-subtle px-1 py-2">
                    <dd className="type-card-title text-foreground">{n}</dd>
                    <dt className="type-caption font-normal text-muted-foreground">{label}</dt>
                  </div>
                ))}
              </dl>
              <Link
                href={`/portal/teacher/results?class=${a.classKey}&subject=${a.subjectCode}`}
                className="mt-auto inline-flex min-h-11 w-fit items-center gap-2 rounded-sm type-label text-primary hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
              >
                Open results
                <ArrowRightIcon className="size-4" aria-hidden="true" />
              </Link>
            </CardContent>
          </Card>
        </li>
      ))}
    </ul>
  )
}

export { AssignmentsList }
