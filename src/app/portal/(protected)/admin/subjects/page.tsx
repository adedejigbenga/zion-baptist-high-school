import type { Metadata } from "next"
import Link from "next/link"
import { PlusIcon } from "lucide-react"

import { ActiveBadge, EmptyRow, PageHeader } from "@/components/admin/common"
import { FormDialog } from "@/components/admin/form-dialog"
import { subjectFields } from "@/components/admin/structure-fields"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { getSubjectList } from "@/lib/services/admin"
import { createSubjectAction } from "@/lib/services/admin-structure-actions"

export const metadata: Metadata = { title: "Subjects" }

export default async function AdminSubjectsPage() {
  const { rows, sessionName } = await getSubjectList()
  return (
    <div className="stack-page">
      <PageHeader title="Subjects" description={sessionName ? `Class and teacher counts are for the current session, ${sessionName}.` : "No current academic session is set."}>
        <FormDialog
          testId="add-subject" title="Add a subject" description="The code identifies the subject everywhere and cannot be changed later."
          triggerLabel="Add subject" triggerIcon={<PlusIcon aria-hidden="true" />} action={createSubjectAction} fields={subjectFields()} submitLabel="Create subject"
        />
      </PageHeader>
      {rows.length === 0 ? (
        <EmptyRow>No subjects yet. Use “Add subject” to create the first one.</EmptyRow>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Subject</TableHead>
              <TableHead>Code</TableHead>
              <TableHead className="text-right">Classes</TableHead>
              <TableHead className="hidden sm:table-cell text-right">Teachers</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((s) => (
              <TableRow key={s.code}>
                <TableCell className="font-medium">
                  <Link href={`/portal/admin/subjects/view?code=${encodeURIComponent(s.code)}`} className="rounded-sm text-primary hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">
                    {s.name}
                  </Link>
                </TableCell>
                <TableCell className="whitespace-nowrap font-mono">{s.code}</TableCell>
                <TableCell className="text-right">{s.classes}</TableCell>
                <TableCell className="hidden sm:table-cell text-right">{s.teachers}</TableCell>
                <TableCell><ActiveBadge active={s.active} /></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  )
}
