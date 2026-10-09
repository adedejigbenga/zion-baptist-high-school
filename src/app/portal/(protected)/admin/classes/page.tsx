import type { Metadata } from "next"
import Link from "next/link"
import { PlusIcon } from "lucide-react"

import { ActiveBadge, EmptyRow, PageHeader } from "@/components/admin/common"
import { classFields } from "@/components/admin/structure-fields"
import { FormDialog } from "@/components/admin/form-dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { getClassList } from "@/lib/services/admin"
import { createClassAction } from "@/lib/services/admin-structure-actions"

export const metadata: Metadata = { title: "Classes" }

export default async function AdminClassesPage() {
  const { rows, sessionName } = await getClassList()
  return (
    <div className="stack-page">
      <PageHeader title="Classes" description={sessionName ? `Counts are for the current session, ${sessionName}.` : "No current academic session is set."}>
        <FormDialog
          testId="add-class" title="Add a class" description="For example JSS 1, or SS 2 with section A."
          triggerLabel="Add class" triggerIcon={<PlusIcon aria-hidden="true" />} action={createClassAction} fields={classFields()} submitLabel="Create class"
        />
      </PageHeader>
      {rows.length === 0 ? (
        <EmptyRow>No classes yet. Use “Add class” to create the first one.</EmptyRow>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Class</TableHead>
              <TableHead className="hidden sm:table-cell">Level</TableHead>
              <TableHead className="text-right">Students</TableHead>
              <TableHead className="text-right">Subjects</TableHead>
              <TableHead className="hidden sm:table-cell text-right">Teachers</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((c) => (
              <TableRow key={c.key}>
                <TableCell className="font-medium">
                  <Link href={`/portal/admin/classes/view?class=${encodeURIComponent(c.key)}`} className="rounded-sm text-primary hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">
                    {c.label}
                  </Link>
                </TableCell>
                <TableCell className="hidden sm:table-cell">{c.level}</TableCell>
                <TableCell className="text-right">{c.students}</TableCell>
                <TableCell className="text-right">{c.subjects}</TableCell>
                <TableCell className="hidden sm:table-cell text-right">{c.teachers}</TableCell>
                <TableCell><ActiveBadge active={c.active} /></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  )
}
