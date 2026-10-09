import type { Metadata } from "next"

import { TeacherButtons } from "@/components/admin/people-forms"
import { ActiveBadge, EmptyRow, PageHeader, Pagination, SearchBar, toPage, toText } from "@/components/admin/common"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { getPersonOptions, getTeachers } from "@/lib/services/admin"

export const metadata: Metadata = { title: "Teachers" }

export default async function AdminTeachersPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams
  const q = toText(params.q)
  const [data, options] = await Promise.all([getTeachers(q, toPage(params.page)), getPersonOptions()])

  return (
    <div className="stack-page">
      <PageHeader title="Teachers" description="Every teacher account.">
        <TeacherButtons
          classes={options.classes.map((c) => ({ value: c.key, label: c.label }))}
          subjects={options.subjects.map((x) => ({ value: x.code, label: `${x.name} (${x.code})` }))}
          teachers={options.teachers.map((t) => ({ value: t.loginId, label: `${t.name} (${t.loginId})` }))}
        />
      </PageHeader>
      <SearchBar action="/portal/admin/teachers" query={q} label="Find a teacher" placeholder="Name or employee number" />
      {data.rows.length === 0 ? (
        <EmptyRow>{q ? `No teacher matches “${q}”.` : "No teachers yet."}</EmptyRow>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Employee number</TableHead>
              <TableHead className="hidden sm:table-cell">Department</TableHead>
              <TableHead>Account</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.rows.map((t) => (
              <TableRow key={t.employeeNumber}>
                <TableCell className="font-medium">{t.name}</TableCell>
                <TableCell className="whitespace-nowrap">{t.employeeNumber}</TableCell>
                <TableCell className="hidden sm:table-cell">{t.department ?? "–"}</TableCell>
                <TableCell><ActiveBadge active={t.active} /></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
      <Pagination basePath="/portal/admin/teachers" params={{ q }} page={data.page} pageCount={data.pageCount} total={data.total} pageSize={data.pageSize} />
    </div>
  )
}
