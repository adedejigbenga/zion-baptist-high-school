import type { Metadata } from "next"
import Form from "next/form"
import Link from "next/link"
import { PlusIcon } from "lucide-react"

import { ActiveBadge, EmptyRow, PageHeader, Pagination, toPage, toText } from "@/components/admin/common"
import { FormDialog } from "@/components/admin/form-dialog"
import { newStudentFields } from "@/components/admin/people-fields"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { NativeSelect } from "@/components/ui/native-select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { getPersonOptions, getStudents } from "@/lib/services/admin"
import { createStudentAction } from "@/lib/services/admin-people-actions"

export const metadata: Metadata = { title: "Students" }

export default async function AdminStudentsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams
  const q = toText(params.q)
  const classKey = toText(params.class, 40)
  const status = ["active", "inactive"].includes(toText(params.status, 10)) ? toText(params.status, 10) : ""
  const [data, options] = await Promise.all([getStudents(q, toPage(params.page), { classKey, status }), getPersonOptions()])
  const filtered = Boolean(q || classKey || status)

  return (
    <div className="stack-page">
      <PageHeader title="Students" description="Every student account, with their class for the current session.">
        <FormDialog
          testId="add-student"
          title="Add a student"
          description="Creates the student's account with a one-time password and enrols them in a class for the current session."
          triggerLabel="Add student"
          triggerIcon={<PlusIcon aria-hidden="true" />}
          action={createStudentAction}
          fields={newStudentFields(options)}
          submitLabel="Create account"
          wide
        />
      </PageHeader>

      <Form action="/portal/admin/students" className="flex flex-col gap-3 lg:flex-row lg:items-end">
        <div className="flex flex-1 flex-col gap-2 lg:max-w-sm">
          <Label htmlFor="student-q">Find a student</Label>
          <input id="student-q" name="q" defaultValue={q} placeholder="Name or admission number" maxLength={80} autoComplete="off" className="min-h-11 w-full rounded-lg border border-input bg-card px-3 type-body focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring" />
        </div>
        <div className="flex flex-col gap-2 lg:w-48">
          <Label htmlFor="student-class">Class</Label>
          <NativeSelect id="student-class" name="class" defaultValue={classKey}>
            <option value="">All classes</option>
            {options.classes.map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}
          </NativeSelect>
        </div>
        <div className="flex flex-col gap-2 lg:w-40">
          <Label htmlFor="student-status">Account</Label>
          <NativeSelect id="student-status" name="status" defaultValue={status}>
            <option value="">All</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </NativeSelect>
        </div>
        <Button type="submit" variant="outline">Apply</Button>
        {filtered && (
          <Link href="/portal/admin/students" className="inline-flex min-h-11 items-center rounded-sm px-2 type-label text-primary hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">
            Clear
          </Link>
        )}
      </Form>

      {data.rows.length === 0 ? (
        <EmptyRow>{filtered ? "No student matches these filters." : "No students yet. Use “Add student” to enrol the first one."}</EmptyRow>
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
                <TableCell className="font-medium">
                  <Link href={`/portal/admin/students/profile?admission=${encodeURIComponent(s.admissionNumber)}`} className="rounded-sm text-primary hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">
                    {s.name}
                  </Link>
                </TableCell>
                <TableCell className="whitespace-nowrap">{s.admissionNumber}</TableCell>
                <TableCell>{s.className ?? <span className="text-muted-foreground">Not enrolled</span>}</TableCell>
                <TableCell className="hidden sm:table-cell">{s.sessionName ?? "–"}</TableCell>
                <TableCell><ActiveBadge active={s.active} /></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
      <Pagination basePath="/portal/admin/students" params={{ q, class: classKey, status }} page={data.page} pageCount={data.pageCount} total={data.total} pageSize={data.pageSize} />
    </div>
  )
}
