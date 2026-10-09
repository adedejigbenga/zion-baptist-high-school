import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { AlertCircleIcon, ArrowLeftIcon, CheckCircle2Icon, ClockIcon, ShieldAlertIcon } from "lucide-react"

import { PageHeader, ResultStatusBadge, toText } from "@/components/admin/common"
import { FormDialog } from "@/components/admin/form-dialog"
import { ResultActions } from "@/components/admin/result-actions"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { TERM_LABEL } from "@/lib/academic"
import { formatDateTime, formatScore } from "@/lib/format"
import { getResultReview } from "@/lib/services/admin"
import { returnForCorrectionAction } from "@/lib/services/admin-result-actions"

export const metadata: Metadata = { title: "Review Result" }

/**
 * Full review of one student's result before publishing. The student is named by admission number and the term by its key
 * (no database IDs). Completeness is computed on the server from the class's subjects and the grading scheme.
 */
export default async function AdminResultReviewPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams
  const review = await getResultReview(toText(params.student, 40), toText(params.term, 40))
  if (!review) notFound()

  const { completeness, status } = review
  const canPublish = completeness.complete && status === "SUBMITTED"

  return (
    <div className="stack-page">
      <Link href="/portal/admin/results" className="inline-flex w-fit items-center gap-2 rounded-sm type-label text-primary hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">
        <ArrowLeftIcon className="size-4" aria-hidden="true" />
        Back to results
      </Link>

      <PageHeader title={review.student.name} description={`${review.student.admissionNumber} · ${review.className} · ${TERM_LABEL[review.termName]}, ${review.sessionName}`}>
        <ResultStatusBadge status={status} />
      </PageHeader>

      {status === "PUBLISHED" ? (
        <Alert variant="success" role="status" data-testid="state-published">
          <CheckCircle2Icon aria-hidden="true" />
          <AlertTitle>Published{review.publishedAt ? ` on ${formatDateTime(review.publishedAt)}` : ""}</AlertTitle>
          <AlertDescription>{review.publishedBy ? `Published by ${review.publishedBy}. ` : ""}The student can view this result in their portal.</AlertDescription>
        </Alert>
      ) : completeness.complete && status === "SUBMITTED" ? (
        <Alert variant="info" role="status" data-testid="state-ready">
          <ClockIcon aria-hidden="true" />
          <AlertTitle>Ready to publish</AlertTitle>
          <AlertDescription>Every subject has every score and has been submitted. The student cannot see this result until you publish it.</AlertDescription>
        </Alert>
      ) : (
        <Alert variant="destructive" data-testid="state-incomplete">
          <ShieldAlertIcon aria-hidden="true" />
          <AlertTitle>This result cannot be published yet</AlertTitle>
          <AlertDescription>
            {completeness.issues.length > 0 ? (
              <ul className="list-disc pl-5">{completeness.issues.map((i) => <li key={i}>{i}</li>)}</ul>
            ) : (
              <p>Teachers have not submitted every subject yet.</p>
            )}
          </AlertDescription>
        </Alert>
      )}

      <Card className="gap-0">
        <CardHeader className="pb-4"><h2 className="type-card-title text-foreground">Subjects and scores</h2></CardHeader>
        <CardContent>
          {completeness.subjects.length === 0 ? (
            <p className="flex items-center gap-2 type-body-sm text-muted-foreground"><AlertCircleIcon className="size-4" aria-hidden="true" />This class has no subjects set up for the session.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Subject</TableHead>
                  {review.scheme.components.map((c) => <TableHead key={c.shortName}>{c.shortName} <span className="font-normal">/{c.maxScore}</span></TableHead>)}
                  <TableHead>Total</TableHead>
                  <TableHead>Grade</TableHead>
                  <TableHead className="hidden md:table-cell">Remark</TableHead>
                  <TableHead>Teacher</TableHead>
                  {status === "SUBMITTED" && <TableHead><span className="sr-only">Actions</span></TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {completeness.subjects.map((s) => (
                  <TableRow key={s.code} data-subject={s.code} data-ok={s.issues.length === 0}>
                    <TableCell className="font-medium">
                      {s.name}
                      {s.issues.length > 0 && <span className="mt-1 block type-caption font-normal text-destructive-soft-foreground">{s.issues.join(" ")}</span>}
                    </TableCell>
                    {review.scheme.components.map((c) => <TableCell key={c.shortName}>{s.scores[c.shortName] == null ? "–" : formatScore(s.scores[c.shortName] as number)}</TableCell>)}
                    <TableCell>{s.total == null ? "–" : formatScore(s.total)}</TableCell>
                    <TableCell>{s.grade ?? "–"}</TableCell>
                    <TableCell className="hidden md:table-cell">{s.remark ?? "–"}</TableCell>
                    <TableCell>
                      {s.entryStatus === "SUBMITTED" ? <Badge variant="info">Submitted</Badge> : s.entryStatus === "DRAFT" ? <Badge variant="warning">Draft</Badge> : <Badge variant="destructive">Missing</Badge>}
                    </TableCell>
                    {status === "SUBMITTED" && (
                      <TableCell>
                        {s.entryStatus === "SUBMITTED" && (
                          <FormDialog
                            title={`Return ${s.name} for correction?`}
                            description="The teacher will be able to edit this subject and submit it again. The scores are kept, and the result goes back to draft until every subject is submitted."
                            triggerLabel={<><span className="sr-only">Return {s.name} for correction</span><span aria-hidden="true">Return</span></>}
                            triggerVariant="outline" triggerSize="sm" testId={`return-${s.code}`}
                            action={returnForCorrectionAction}
                            hidden={{ admission: review.student.admissionNumber, termKey: review.termKey, subjectCode: s.code }}
                            fields={[{ name: "reason", label: "Reason (shown in the audit log)", kind: "textarea", maxLength: 300 }]}
                            submitLabel="Return to teacher"
                          />
                        )}
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
          {review.overall && (
            <dl className="mt-4 grid gap-3 sm:grid-cols-3">
              {([["Subjects", String(completeness.subjects.length)], ["Overall total", formatScore(review.overall.total)], ["Average", formatScore(review.overall.average)]] as const).map(([label, v]) => (
                <div key={label} className="rounded-lg bg-surface-subtle px-4 py-3">
                  <dt className="type-caption font-normal text-muted-foreground">{label}</dt>
                  <dd className="type-card-title text-foreground">{v}</dd>
                </div>
              ))}
            </dl>
          )}
        </CardContent>
      </Card>

      <Card size="sm">
        <CardHeader><h2 className="type-card-title text-foreground">Publication</h2></CardHeader>
        <CardContent className="flex flex-col gap-4">
          <ResultActions admission={review.student.admissionNumber} termKey={review.termKey} studentName={review.student.name} status={status} canPublish={canPublish} />
          {!canPublish && status !== "PUBLISHED" && <p className="type-body-sm text-muted-foreground">Publishing is disabled until the problems above are fixed. A result is only published when it is complete.</p>}
          {review.history.length > 0 && (
            <div>
              <h3 className="mb-2 type-label text-foreground">History</h3>
              <ul className="flex flex-col gap-1 type-body-sm text-muted-foreground">
                {review.history.map((h) => <li key={`${h.action}${h.at.toISOString()}`}>{h.action === "PUBLISHED" ? "Published" : "Unpublished"} by {h.by} on {formatDateTime(h.at)}</li>)}
              </ul>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
