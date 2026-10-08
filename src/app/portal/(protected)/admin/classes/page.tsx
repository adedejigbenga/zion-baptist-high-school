import type { Metadata } from "next"

import { ActiveBadge, EmptyRow, PageHeader } from "@/components/admin/common"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { getClasses } from "@/lib/services/admin"

export const metadata: Metadata = { title: "Classes" }

export default async function AdminClassesPage() {
  const classes = await getClasses()
  return (
    <div className="stack-page">
      <PageHeader title="Classes" description="Student counts are for the current academic session." />
      {classes.length === 0 ? (
        <EmptyRow>No classes yet.</EmptyRow>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Class</TableHead>
              <TableHead>Section</TableHead>
              <TableHead>Level</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Students</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {classes.map((c) => (
              <TableRow key={`${c.name}:${c.section ?? ""}`}>
                <TableCell className="font-medium">{c.name}</TableCell>
                <TableCell>{c.section ?? "–"}</TableCell>
                <TableCell>{c.level}</TableCell>
                <TableCell><ActiveBadge active={c.active} /></TableCell>
                <TableCell className="text-right">{c.studentCount}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  )
}
