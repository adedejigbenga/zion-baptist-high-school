import type { Metadata } from "next"
import Link from "next/link"
import { LinkIcon, PlusIcon } from "lucide-react"

import { FormDialog } from "@/components/admin/form-dialog"
import { ActiveBadge, EmptyRow, PageHeader, Pagination, SearchBar, toPage, toText } from "@/components/admin/common"
import { assignFields, newTeacherFields } from "@/components/admin/people-fields"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { assignTeacherAction, createTeacherAction } from "@/lib/services/admin-people-actions"
import { getPersonOptions, getTeachers } from "@/lib/services/admin"

export const metadata: Metadata = { title: "Teachers" }

export default async function AdminTeachersPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams
  const q = toText(params.q)
  const [data, options] = await Promise.all([getTeachers(q, toPage(params.page)), getPersonOptions()])

  return (
    <div className="stack-page">
      <PageHeader title="Teachers" description="Teacher accounts and the classes and subjects they teach.">
        <FormDialog
          testId="add-teacher"
          title="Add a teacher"
          description="Creates the teacher's account with a one-time password, shown once after you save."
          triggerLabel="Add teacher"
          triggerIcon={<PlusIcon aria-hidden="true" />}
          action={createTeacherAction}
          fields={newTeacherFields}
          submitLabel="Create account"
          wide
        />
        <FormDialog
          testId="add-assign"
          title="Assign a class and subject"
          description="Lets the teacher enter results for this class and subject in the current session."
          triggerLabel="Assign class & subject"
          triggerIcon={<LinkIcon aria-hidden="true" />}
          triggerVariant="outline"
          action={assignTeacherAction}
          fields={assignFields(options, { teacher: true })}
          submitLabel="Save assignment"
        />
      </PageHeader>
      <SearchBar action="/portal/admin/teachers" query={q} label="Find a teacher" placeholder="Name or employee number" />
      {data.rows.length === 0 ? (
        <EmptyRow>{q ? `No teacher matches “${q}”.` : "No teachers yet. Use “Add teacher” to create the first one."}</EmptyRow>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Employee number</TableHead>
              <TableHead className="hidden sm:table-cell">Department</TableHead>
              <TableHead className="hidden md:table-cell text-right">Assignments</TableHead>
              <TableHead>Account</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.rows.map((t) => (
              <TableRow key={t.employeeNumber}>
                <TableCell className="font-medium">
                  <Link href={`/portal/admin/teachers/profile?login=${encodeURIComponent(t.loginId)}`} className="rounded-sm text-primary hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">
                    {t.name}
                  </Link>
                </TableCell>
                <TableCell className="whitespace-nowrap">{t.employeeNumber}</TableCell>
                <TableCell className="hidden sm:table-cell">{t.department ?? "–"}</TableCell>
                <TableCell className="hidden md:table-cell text-right">{t.assignmentCount}</TableCell>
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
