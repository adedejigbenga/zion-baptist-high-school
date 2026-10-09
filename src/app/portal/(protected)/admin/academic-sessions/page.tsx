import type { Metadata } from "next"
import { CalendarCheckIcon, PencilIcon, PlusIcon } from "lucide-react"

import { EmptyRow, PageHeader } from "@/components/admin/common"
import { FormDialog, type FieldSpec } from "@/components/admin/form-dialog"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { TERM_LABEL } from "@/lib/academic"
import { formatDate } from "@/lib/format"
import { getSessions } from "@/lib/services/admin"
import {
  createSessionAction,
  saveTermAction,
  setCurrentSessionAction,
  setCurrentTermAction,
  updateSessionAction,
} from "@/lib/services/admin-structure-actions"

export const metadata: Metadata = { title: "Academic Sessions" }

const iso = (d: Date) => d.toISOString().slice(0, 10)

const newSessionFields: FieldSpec[] = [
  { name: "name", label: "Session name", placeholder: "2027/2028", maxLength: 9, hint: "Two consecutive years, for example 2027/2028." },
  { name: "startDate", label: "Session starts", kind: "date", half: true },
  { name: "endDate", label: "Session ends", kind: "date", half: true },
  { name: "firstStart", label: "First Term starts", kind: "date", half: true },
  { name: "firstEnd", label: "First Term ends", kind: "date", half: true },
  { name: "secondStart", label: "Second Term starts", kind: "date", half: true },
  { name: "secondEnd", label: "Second Term ends", kind: "date", half: true },
  { name: "thirdStart", label: "Third Term starts", kind: "date", half: true },
  { name: "thirdEnd", label: "Third Term ends", kind: "date", half: true },
  { name: "makeCurrent", label: "Make this the current session", kind: "checkbox", hint: "The previous session stays in the system, just no longer current." },
]

export default async function AdminAcademicsPage() {
  const sessions = await getSessions()
  const current = sessions.find((s) => s.isCurrent)
  const currentTerm = current?.terms.find((t) => t.isCurrent)

  return (
    <div className="stack-page">
      <PageHeader title="Academic Sessions" description="Sessions and terms. Nothing here is ever deleted: results, enrolments and assignments keep referring to their session.">
        <Badge variant="secondary">Current session: {current?.name ?? "Not set"}</Badge>
        <Badge variant="secondary">Current term: {currentTerm ? TERM_LABEL[currentTerm.name] : "Not set"}</Badge>
        <FormDialog
          testId="add-session" title="New academic session" description="Creates the session with its three terms. Term dates must sit inside the session and not overlap."
          triggerLabel="New session" triggerIcon={<PlusIcon aria-hidden="true" />} action={createSessionAction} fields={newSessionFields} submitLabel="Create session" wide
        />
      </PageHeader>

      {sessions.length === 0 ? (
        <EmptyRow>No academic sessions yet. Use “New session” to create the first one.</EmptyRow>
      ) : (
        <div className="grid gap-4 xl:grid-cols-2">
          {sessions.map((s) => (
            <Card key={s.key} size="sm" variant={s.isCurrent ? "subtle" : "default"} data-session={s.name}>
              <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-2">
                <div>
                  <h2 className="type-card-title text-foreground">{s.name}</h2>
                  <p className="type-body-sm text-muted-foreground">{formatDate(s.startDate)} – {formatDate(s.endDate)}</p>
                  <p className="type-caption font-normal text-muted-foreground">{s.counts.students} enrolments · {s.counts.assignments} teacher assignments · {s.counts.results} results</p>
                </div>
                {s.isCurrent ? <Badge variant="success">Current session</Badge> : <Badge variant="neutral">Not current</Badge>}
              </CardHeader>
              <CardContent className="flex flex-col gap-4">
                <div className="flex flex-wrap gap-2">
                  <FormDialog
                    title={`Edit ${s.name}`} description="Change the session dates. The terms must still fit inside them."
                    triggerLabel="Edit dates" triggerIcon={<PencilIcon aria-hidden="true" />} triggerVariant="outline" triggerSize="sm"
                    action={updateSessionAction} hidden={{ sessionKey: s.key }}
                    fields={[
                      { name: "startDate", label: "Session starts", kind: "date", half: true, defaultValue: iso(s.startDate) },
                      { name: "endDate", label: "Session ends", kind: "date", half: true, defaultValue: iso(s.endDate) },
                    ]}
                    submitLabel="Save dates"
                  />
                  {(
                    <FormDialog
                      triggerDisabled={s.isCurrent}
                      title={`Make ${s.name} the current session?`} description="It becomes the session teachers, students and results work in. The current session stops being current but keeps all its records. The current term is set to the term running today (or the first term)."
                      triggerLabel={s.isCurrent ? "Current session" : "Set as current"} triggerIcon={<CalendarCheckIcon aria-hidden="true" />} triggerSize="sm"
                      action={setCurrentSessionAction} hidden={{ sessionKey: s.key }} submitLabel="Yes, make current"
                    />
                  )}
                </div>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Term</TableHead>
                      <TableHead>Dates</TableHead>
                      <TableHead className="text-right"><span className="sr-only">Actions</span></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {s.terms.map((t) => (
                      <TableRow key={t.name}>
                        <TableCell className="font-medium">{t.label} {t.isCurrent && <Badge variant="success">Current</Badge>}</TableCell>
                        <TableCell className="type-body-sm">{formatDate(t.startDate)} – {formatDate(t.endDate)}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex flex-wrap justify-end gap-2">
                            <FormDialog
                              title={`Edit ${t.label}, ${s.name}`} description="Term dates must fall inside the session and not overlap another term."
                              triggerLabel={<><span className="sr-only">Edit {t.label} of {s.name}</span><span aria-hidden="true">Edit</span></>} triggerIcon={<PencilIcon aria-hidden="true" />} triggerVariant="outline" triggerSize="sm"
                              action={saveTermAction} hidden={{ sessionKey: s.key, term: t.name }}
                              fields={[
                                { name: "startDate", label: "Term starts", kind: "date", half: true, defaultValue: iso(t.startDate) },
                                { name: "endDate", label: "Term ends", kind: "date", half: true, defaultValue: iso(t.endDate) },
                              ]}
                              submitLabel="Save term"
                            />
                            {s.isCurrent && (
                              <FormDialog
                                triggerDisabled={t.isCurrent}
                                title={`Make ${t.label} the current term?`} description="Teachers will enter results for this term and students will see its result."
                                triggerLabel={<><span className="sr-only">{t.isCurrent ? `${t.label} is the current term` : `Make ${t.label} current`}</span><span aria-hidden="true">{t.isCurrent ? "Current" : "Set current"}</span></>} triggerSize="sm"
                                action={setCurrentTermAction} hidden={{ sessionKey: s.key, term: t.name }} submitLabel="Yes, make current"
                              />
                            )}
                          </div>
                        </TableCell>
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
