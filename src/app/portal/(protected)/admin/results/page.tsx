import type { Metadata } from "next"
import Form from "next/form"
import Link from "next/link"

import { EmptyRow, PageHeader, Pagination, ResultStatusBadge, toPage, toText } from "@/components/admin/common"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { NativeSelect } from "@/components/ui/native-select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { getResultFilterOptions, getResultList } from "@/lib/services/admin"

export const metadata: Metadata = { title: "Result Administration" }

const STATUSES = ["ALL", "SUBMITTED", "DRAFT", "PUBLISHED"] as const
const STATUS_LABEL: Record<string, string> = { ALL: "All statuses", SUBMITTED: "Submitted (awaiting publication)", DRAFT: "Draft", PUBLISHED: "Published" }

/**
 * Result administration. The filters are plain query values (session key, term, class key, subject code, status) that
 * the server matches against real records; anything unrecognised simply matches nothing.
 */
export default async function AdminResultsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams
  const options = await getResultFilterOptions()

  const session = toText(params.session, 20) || options.currentSession || options.sessions[0]?.key || ""
  const term = toText(params.term, 10) || options.currentTerm || "all"
  const classKey = toText(params.class, 40)
  const subject = toText(params.subject, 20)
  const requestedStatus = toText(params.status, 12)
  const status = (STATUSES as readonly string[]).includes(requestedStatus) ? requestedStatus : "ALL"

  const list = await getResultList({ session, term, classKey, subject, status, page: toPage(params.page) })
  const keep = { session, term, class: classKey, subject, status }

  return (
    <div className="stack-page">
      <PageHeader title="Result Administration" description="Review what teachers have submitted, then publish it to students.">
        <Badge variant="info">Submitted: {list.counts.SUBMITTED}</Badge>
        <Badge variant="warning">Draft: {list.counts.DRAFT}</Badge>
        <Badge variant="success">Published: {list.counts.PUBLISHED}</Badge>
      </PageHeader>

      <Form action="/portal/admin/results" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-[repeat(5,minmax(0,1fr))_auto] xl:items-end">
        <div className="flex flex-col gap-2">
          <Label htmlFor="f-session">Session</Label>
          <NativeSelect id="f-session" name="session" defaultValue={session}>
            {options.sessions.map((s) => <option key={s.key} value={s.key}>{s.name}</option>)}
          </NativeSelect>
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="f-term">Term</Label>
          <NativeSelect id="f-term" name="term" defaultValue={term}>
            <option value="all">All terms</option>
            <option value="first">First Term</option>
            <option value="second">Second Term</option>
            <option value="third">Third Term</option>
          </NativeSelect>
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="f-class">Class</Label>
          <NativeSelect id="f-class" name="class" defaultValue={classKey}>
            <option value="">All classes</option>
            {options.classes.map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}
          </NativeSelect>
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="f-subject">Subject</Label>
          <NativeSelect id="f-subject" name="subject" defaultValue={subject}>
            <option value="">All subjects</option>
            {options.subjects.map((s) => <option key={s.code} value={s.code}>{s.name}</option>)}
          </NativeSelect>
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="f-status">Status</Label>
          <NativeSelect id="f-status" name="status" defaultValue={status}>
            {STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
          </NativeSelect>
        </div>
        <Button type="submit" variant="outline">Apply filters</Button>
      </Form>

      {list.rows.length === 0 ? (
        <EmptyRow>No results match these filters.</EmptyRow>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Student</TableHead>
              <TableHead className="hidden md:table-cell">Admission number</TableHead>
              <TableHead>Class</TableHead>
              <TableHead className="hidden lg:table-cell">Term</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="hidden sm:table-cell">Subjects submitted</TableHead>
              <TableHead className="text-right"><span className="sr-only">Actions</span></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {list.rows.map((r) => (
              <TableRow key={`${r.admissionNumber}:${r.termKey}`} data-admission={r.admissionNumber}>
                <TableCell className="font-medium">
                  <Link
                    href={`/portal/admin/results/review?${new URLSearchParams({ student: r.admissionNumber, term: r.termKey })}`}
                    className="rounded-sm text-primary hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                  >
                    {r.studentName}
                  </Link>
                  <span className="block type-caption font-normal text-muted-foreground md:hidden">{r.admissionNumber}</span>
                </TableCell>
                <TableCell className="hidden whitespace-nowrap md:table-cell">{r.admissionNumber}</TableCell>
                <TableCell>{r.className}</TableCell>
                <TableCell className="hidden lg:table-cell">{r.termLabel}</TableCell>
                <TableCell><ResultStatusBadge status={r.status} /></TableCell>
                <TableCell className="hidden sm:table-cell">{r.submittedSubjects} of {r.requiredSubjects}</TableCell>
                <TableCell className="text-right">
                  <Link
                    href={`/portal/admin/results/review?${new URLSearchParams({ student: r.admissionNumber, term: r.termKey })}`}
                    className="inline-flex min-h-10 items-center rounded-sm px-2 type-label text-primary hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                  >
                    Review<span className="sr-only"> {r.studentName}</span>
                  </Link>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
      <Pagination basePath="/portal/admin/results" params={keep} page={list.page} pageCount={list.pageCount} total={list.total} pageSize={list.pageSize} />
    </div>
  )
}
