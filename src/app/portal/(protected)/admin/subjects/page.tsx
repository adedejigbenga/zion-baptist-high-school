import type { Metadata } from "next"

import { ActiveBadge, EmptyRow, PageHeader } from "@/components/admin/common"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { getSubjects } from "@/lib/services/admin"

export const metadata: Metadata = { title: "Subjects" }

export default async function AdminSubjectsPage() {
  const subjects = await getSubjects()
  return (
    <div className="stack-page">
      <PageHeader title="Subjects" description="Subjects the school offers." />
      {subjects.length === 0 ? (
        <EmptyRow>No subjects yet.</EmptyRow>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Subject</TableHead>
              <TableHead>Code</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {subjects.map((s) => (
              <TableRow key={s.code}>
                <TableCell className="font-medium">{s.name}</TableCell>
                <TableCell>{s.code}</TableCell>
                <TableCell><ActiveBadge active={s.active} /></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  )
}
