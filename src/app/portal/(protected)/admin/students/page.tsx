import type { Metadata } from "next"

import { AddStudentButton } from "@/components/admin/people-forms"
import { ActiveBadge, EmptyRow, PageHeader, Pagination, SearchBar, toPage, toText } from "@/components/admin/common"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { getPersonOptions, getStudents } from "@/lib/services/admin"

export const metadata: Metadata = { title: "Students" }

export default async function AdminStudentsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams
  const q = toText(params.q)
  const [data, options] = await Promise.all([getStudents(q, toPage(params.page)), getPersonOptions()])

  return (
    <div className="stack-page">
      <PageHeader title="Students" description="Every student account, with their class for the current session.">
        <AddStudentButton classes={options.classes.map((c) => ({ value: c.key, label: c.label }))} />
      </PageHeader>
      <SearchBar action="/portal/admin/students" query={q} label="Find a student" placeholder="Name or admission number" />
      {data.rows.length === 0 ? (
        <EmptyRow>{q ? `No student matches “${q}”.` : "No students yet."}</EmptyRow>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Admission number</TableHead>
              <TableHead>Class</TableHead>
              <TableHead className="hidden sm:table-cell">Session</TableHead>
              <TableHead>Account</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.rows.map((s) => (
              <TableRow key={s.admissionNumber}>
                <TableCell className="font-medium">{s.name}</TableCell>
                <TableCell className="whitespace-nowrap">{s.admissionNumber}</TableCell>
                <TableCell>{s.className ?? <span className="text-muted-foreground">Not enrolled</span>}</TableCell>
                <TableCell className="hidden sm:table-cell">{s.sessionName ?? "–"}</TableCell>
                <TableCell><ActiveBadge active={s.active} /></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
      <Pagination basePath="/portal/admin/students" params={{ q }} page={data.page} pageCount={data.pageCount} total={data.total} pageSize={data.pageSize} />
    </div>
  )
}
