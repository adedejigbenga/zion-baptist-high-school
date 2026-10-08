import type { Metadata } from "next"
import { LockIcon } from "lucide-react"

import { EmptyRow, PageHeader } from "@/components/admin/common"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { TERM_LABEL } from "@/lib/academic"
import { formatDate } from "@/lib/format"
import { getAcademics } from "@/lib/services/admin"

export const metadata: Metadata = { title: "Academic Sessions" }

export default async function AdminAcademicsPage() {
  const { sessions } = await getAcademics()
  const current = sessions.find((s) => s.isCurrent)
  const currentTerm = current?.terms.find((t) => t.isCurrent)

  return (
    <div className="stack-page">
      <PageHeader title="Academic Sessions" description="Sessions and terms. Historical records are kept permanently: nothing here can be deleted.">
        <Badge variant="secondary">Current session: {current?.name ?? "Not set"}</Badge>
        <Badge variant="secondary">Current term: {currentTerm ? TERM_LABEL[currentTerm.name] : "Not set"}</Badge>
      </PageHeader>
      <p className="flex items-start gap-2 type-body-sm text-muted-foreground">
        <LockIcon className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
        Academic records are read-only here. Results, enrolments and publications refer to these sessions, so they are never removed.
      </p>
      {sessions.length === 0 ? (
        <EmptyRow>No academic sessions yet.</EmptyRow>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {sessions.map((s) => (
            <Card key={s.name} size="sm" variant={s.isCurrent ? "subtle" : "default"}>
              <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2">
                <div>
                  <h2 className="type-card-title text-foreground">{s.name}</h2>
                  <p className="type-body-sm text-muted-foreground">{formatDate(s.startDate)} – {formatDate(s.endDate)}</p>
                </div>
                {s.isCurrent ? <Badge variant="success">Current session</Badge> : <Badge variant="neutral">Past</Badge>}
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Term</TableHead>
                      <TableHead>Dates</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {s.terms.map((t) => (
                      <TableRow key={t.name}>
                        <TableCell className="font-medium">{TERM_LABEL[t.name]}</TableCell>
                        <TableCell className="type-body-sm">{formatDate(t.startDate)} – {formatDate(t.endDate)}</TableCell>
                        <TableCell>{t.isCurrent ? <Badge variant="success">Current term</Badge> : <Badge variant="neutral">–</Badge>}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
