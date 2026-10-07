import type { Metadata } from "next"

import { AssignmentsList } from "@/components/teacher/assignments-list"
import { Badge } from "@/components/ui/badge"
import { TERM_LABEL } from "@/lib/academic"
import { getTeacherOverview } from "@/lib/services/teacher"

export const metadata: Metadata = { title: "My Classes" }

export default async function TeacherClassesPage() {
  const overview = await getTeacherOverview()
  return (
    <div className="stack-page">
      <div className="flex flex-col gap-2">
        <h1 className="type-page-title text-brand-950">My Classes</h1>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary">Session: {overview.sessionName ?? "Not set"}</Badge>
          <Badge variant="secondary">Term: {overview.termName ? TERM_LABEL[overview.termName] : "Not set"}</Badge>
        </div>
      </div>
      <AssignmentsList assignments={overview.assignments} />
    </div>
  )
}
