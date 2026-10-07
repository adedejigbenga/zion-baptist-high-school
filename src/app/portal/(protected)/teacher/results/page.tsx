import type { Metadata } from "next"
import Form from "next/form"
import Link from "next/link"
import { AlertCircleIcon, ShieldAlertIcon } from "lucide-react"

import { ResultsForm } from "@/components/teacher/results-form"
import { ResultsPicker } from "@/components/teacher/results-picker"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { SearchInput } from "@/components/ui/search-input"
import { TERM_LABEL } from "@/lib/academic"
import { getTeacherWorkspace } from "@/lib/services/teacher"

export const metadata: Metadata = { title: "Result Management" }

type Params = Record<string, string | string[] | undefined>
const single = (v: string | string[] | undefined) => (Array.isArray(v) ? "" : v)

/**
 * Result management. The URL carries only a class key, a subject code and a search text. They are matched against the
 * signed-in teacher's own assignments on the server; anything else is refused and nothing about it is shown.
 */
export default async function TeacherResultsPage({ searchParams }: { searchParams: Promise<Params> }) {
  const params = await searchParams
  const workspace = await getTeacherWorkspace(single(params.class), single(params.subject), single(params.q))

  return (
    <div className="stack-page">
      <header className="flex flex-col gap-2">
        <h1 className="type-page-title text-brand-950">Result Management</h1>
        <p className="type-body text-muted-foreground">Enter scores for the classes and subjects assigned to you.</p>
        {workspace.kind === "READY" && (
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary">Session: {workspace.sessionName}</Badge>
            <Badge variant="secondary">Term: {TERM_LABEL[workspace.termName]}</Badge>
          </div>
        )}
      </header>

      {workspace.kind === "NO_TERM" && (
        <Alert variant="info" role="status">
          <AlertCircleIcon aria-hidden="true" />
          <AlertTitle>No current term</AlertTitle>
          <AlertDescription>The school has not set the current academic term yet. Please check back soon.</AlertDescription>
        </Alert>
      )}
      {workspace.kind === "NO_SCHEME" && (
        <Alert variant="info" role="status">
          <AlertCircleIcon aria-hidden="true" />
          <AlertTitle>Grading is not set up</AlertTitle>
          <AlertDescription>The grading scheme has not been configured yet. Please contact the administrator.</AlertDescription>
        </Alert>
      )}
      {workspace.kind === "NO_ASSIGNMENTS" && (
        <Alert variant="info" role="status">
          <AlertCircleIcon aria-hidden="true" />
          <AlertTitle>No classes assigned</AlertTitle>
          <AlertDescription>You have not been assigned a class and subject for this session. Please contact the administrator.</AlertDescription>
        </Alert>
      )}
      {workspace.kind === "NOT_AUTHORIZED" && (
        <Alert variant="destructive" data-testid="not-authorized">
          <ShieldAlertIcon aria-hidden="true" />
          <AlertTitle>You do not have access to that class and subject</AlertTitle>
          <AlertDescription>
            <Link href="/portal/teacher/results" className="underline">
              Go back to your own classes
            </Link>
          </AlertDescription>
        </Alert>
      )}

      {workspace.kind === "READY" && (
        <>
          <ResultsPicker options={workspace.options} classKey={workspace.selected.classKey} subjectCode={workspace.selected.subjectCode} />

          <Form action="/portal/teacher/results" className="flex flex-col gap-2 sm:flex-row sm:items-end">
            <input type="hidden" name="class" value={workspace.selected.classKey} />
            <input type="hidden" name="subject" value={workspace.selected.subjectCode} />
            <div className="flex flex-1 flex-col gap-2">
              <Label htmlFor="student-search">Find a student</Label>
              <SearchInput id="student-search" name="q" defaultValue={workspace.query} placeholder="Name or admission number" maxLength={80} autoComplete="off" />
            </div>
            <Button type="submit" variant="outline">
              Search
            </Button>
            {workspace.query && (
              <Link
                href={`/portal/teacher/results?class=${workspace.selected.classKey}&subject=${workspace.selected.subjectCode}`}
                className="inline-flex min-h-11 items-center rounded-sm px-2 type-label text-primary hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
              >
                Clear
              </Link>
            )}
          </Form>

          <section aria-labelledby="scores-heading" className="flex flex-col gap-4">
            <h2 id="scores-heading" className="type-section-title text-foreground">
              {workspace.selected.className} · {workspace.selected.subjectName}
              <span className="ml-2 type-body-sm font-normal text-muted-foreground">
                {workspace.totalStudents} {workspace.totalStudents === 1 ? "student" : "students"}
              </span>
            </h2>
            <ResultsForm key={`${workspace.selected.classKey}:${workspace.selected.subjectCode}:${workspace.query}`} workspace={workspace} />
          </section>
        </>
      )}
    </div>
  )
}
