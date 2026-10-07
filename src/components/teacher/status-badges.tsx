import { CheckCircle2Icon, CircleDashedIcon, ClockIcon, PencilLineIcon, UsersIcon } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import type { AssignmentStatus, RowStatus } from "@/types/teacher"

/** Status badges always pair an icon with text, so meaning never depends on colour. */
function AssignmentStatusBadge({ status }: { status: AssignmentStatus }) {
  switch (status) {
    case "NO_STUDENTS":
      return <Badge variant="neutral"><UsersIcon aria-hidden="true" />No students</Badge>
    case "NOT_STARTED":
      return <Badge variant="neutral"><CircleDashedIcon aria-hidden="true" />Not started</Badge>
    case "IN_PROGRESS":
      return <Badge variant="warning"><PencilLineIcon aria-hidden="true" />In progress</Badge>
    case "SUBMITTED":
      return <Badge variant="info"><ClockIcon aria-hidden="true" />Awaiting publication</Badge>
    case "PUBLISHED":
      return <Badge variant="success"><CheckCircle2Icon aria-hidden="true" />Published</Badge>
  }
}

function RowStatusBadge({ status }: { status: RowStatus }) {
  switch (status) {
    case "NOT_STARTED":
      return <Badge variant="neutral"><CircleDashedIcon aria-hidden="true" />Not started</Badge>
    case "DRAFT":
      return <Badge variant="warning"><PencilLineIcon aria-hidden="true" />Draft</Badge>
    case "SUBMITTED":
      return <Badge variant="info"><ClockIcon aria-hidden="true" />Submitted</Badge>
    case "PUBLISHED":
      return <Badge variant="success"><CheckCircle2Icon aria-hidden="true" />Published</Badge>
  }
}

export { AssignmentStatusBadge, RowStatusBadge }
