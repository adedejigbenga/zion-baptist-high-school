import type { Metadata } from "next"
import { CopyIcon, LockIcon, PencilIcon, PlusIcon, StarIcon, Trash2Icon } from "lucide-react"

import { EmptyRow, PageHeader } from "@/components/admin/common"
import { FormDialog, type FieldSpec } from "@/components/admin/form-dialog"
import { bandFields, componentFields } from "@/components/admin/structure-fields"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { getGrading } from "@/lib/services/admin"
import {
  addBandAction,
  addComponentAction,
  createSchemeAction,
  deleteBandAction,
  deleteComponentAction,
  setDefaultSchemeAction,
  updateBandAction,
  updateComponentAction,
} from "@/lib/services/admin-structure-actions"

export const metadata: Metadata = { title: "Grading" }

const num = (n: number) => String(n)

export default async function AdminGradingPage() {
  const schemes = await getGrading()
  const copyOptions = schemes.map((s) => ({ value: s.name, label: s.name }))
  const newSchemeFields: FieldSpec[] = [
    { name: "name", label: "Scheme name", maxLength: 80, hint: "For example Standard Grading 2027." },
    { name: "description", label: "Description (optional)", kind: "textarea", maxLength: 200 },
    { name: "copyFrom", label: "Start from", kind: "select", defaultValue: "", options: [{ value: "", label: "An empty scheme" }, ...copyOptions], hint: "Copying keeps the components and grade bands so you only change what is different." },
  ]

  return (
    <div className="stack-page">
      <PageHeader title="Grading" description="Assessment components and grade bands. Totals, grades and remarks everywhere come from these records.">
        <FormDialog
          testId="add-scheme" title="New grading scheme" description="A new scheme starts empty or as a copy of an existing one. It is not used until you make it the default."
          triggerLabel="New scheme" triggerIcon={<PlusIcon aria-hidden="true" />} action={createSchemeAction} fields={newSchemeFields} submitLabel="Create scheme"
        />
      </PageHeader>
      <p className="flex items-start gap-2 type-body-sm text-muted-foreground">
        <LockIcon className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
        Every result keeps the scheme it was created with. A scheme that results already use is locked, so published results never change meaning. To change the rules, copy the scheme, edit the copy and make it the default.
      </p>

      {schemes.length === 0 ? (
        <EmptyRow>No grading scheme exists yet. Create one to let teachers enter results.</EmptyRow>
      ) : (
        <div className="flex flex-col gap-6">
          {schemes.map((s) => (
            <Card key={s.name} data-scheme={s.name} variant={s.isDefault ? "subtle" : "default"} className="gap-0">
              <CardHeader className="flex flex-col gap-3 pb-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex flex-col gap-1">
                  <h2 className="type-card-title text-foreground">{s.name}</h2>
                  {s.description && <p className="type-body-sm text-muted-foreground">{s.description}</p>}
                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    {s.isDefault && <Badge variant="success"><StarIcon aria-hidden="true" />Default scheme</Badge>}
                    {s.locked && <Badge variant="warning"><LockIcon aria-hidden="true" />Locked: used by {s.usedByResults} {s.usedByResults === 1 ? "result" : "results"}</Badge>}
                    <Badge variant={s.weightTotal === 100 ? "neutral" : "warning"}>Weights total {num(s.weightTotal)}</Badge>
                  </div>
                  {s.notReady && !s.isDefault && <p className="type-caption font-normal text-muted-foreground">Not ready to be the default: {s.notReady}</p>}
                </div>
                <div className="flex flex-wrap gap-2">
                  {!s.isDefault && (
                    <FormDialog
                      title={`Make "${s.name}" the default?`} description="New results will use this scheme. Results that already exist keep the scheme they were created with."
                      triggerLabel="Make default" triggerIcon={<StarIcon aria-hidden="true" />} triggerSize="sm"
                      action={setDefaultSchemeAction} hidden={{ scheme: s.name }} submitLabel="Yes, make default"
                    />
                  )}
                  <FormDialog
                    title={`Copy "${s.name}"`} description="Creates a new scheme with the same components and grade bands that you can edit."
                    triggerLabel="Copy" triggerIcon={<CopyIcon aria-hidden="true" />} triggerVariant="outline" triggerSize="sm"
                    action={createSchemeAction} hidden={{ copyFrom: s.name }}
                    fields={[{ name: "name", label: "Name of the copy", maxLength: 80, defaultValue: `${s.name} (copy)` }, { name: "description", label: "Description (optional)", kind: "textarea", maxLength: 200, defaultValue: s.description ?? "" }]}
                    submitLabel="Create copy"
                  />
                </div>
              </CardHeader>

              <CardContent className="flex flex-col gap-8">
                <section className="flex flex-col gap-3" aria-label={`Assessment components of ${s.name}`}>
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <h3 className="type-label text-foreground">Assessment components</h3>
                    {!s.locked && (
                      <FormDialog
                        title="Add an assessment component" description="Each component becomes a score column for teachers and students."
                        triggerLabel="Add component" triggerIcon={<PlusIcon aria-hidden="true" />} triggerVariant="outline" triggerSize="sm"
                        action={addComponentAction} hidden={{ scheme: s.name }} fields={componentFields()} submitLabel="Add component" wide
                      />
                    )}
                  </div>
                  {s.components.length === 0 ? (
                    <EmptyRow>No components yet.</EmptyRow>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Component</TableHead>
                          <TableHead>Short name</TableHead>
                          <TableHead className="text-right">Out of</TableHead>
                          <TableHead className="text-right">Weight %</TableHead>
                          {!s.locked && <TableHead className="text-right"><span className="sr-only">Actions</span></TableHead>}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {s.components.map((c) => (
                          <TableRow key={c.shortName}>
                            <TableCell className="font-medium">{c.name}</TableCell>
                            <TableCell>{c.shortName}</TableCell>
                            <TableCell className="text-right">{num(c.maxScore)}</TableCell>
                            <TableCell className="text-right">{num(c.weight)}</TableCell>
                            {!s.locked && (
                              <TableCell className="text-right">
                                <div className="flex flex-wrap justify-end gap-2">
                                  <FormDialog
                                    title={`Edit ${c.name}`} triggerLabel={<><span className="sr-only">Edit {c.name}</span><span aria-hidden="true">Edit</span></>} triggerIcon={<PencilIcon aria-hidden="true" />} triggerVariant="outline" triggerSize="sm"
                                    action={updateComponentAction} hidden={{ scheme: s.name, current: c.shortName }} fields={componentFields(c)} submitLabel="Save component" wide
                                  />
                                  <FormDialog
                                    title={`Delete ${c.name}?`} description="Teachers will no longer see this column for new results."
                                    triggerLabel={<><span className="sr-only">Delete {c.name}</span><span aria-hidden="true">Delete</span></>} triggerIcon={<Trash2Icon aria-hidden="true" />} triggerVariant="outline" triggerSize="sm"
                                    action={deleteComponentAction} hidden={{ scheme: s.name, shortName: c.shortName }} submitLabel="Yes, delete" destructive
                                  />
                                </div>
                              </TableCell>
                            )}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </section>

                <section className="flex flex-col gap-3" aria-label={`Grade bands of ${s.name}`}>
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <h3 className="type-label text-foreground">Grade bands</h3>
                    {!s.locked && (
                      <FormDialog
                        title="Add a grade band" description="Bands must not overlap. A total falls in the band whose range contains it."
                        triggerLabel="Add grade" triggerIcon={<PlusIcon aria-hidden="true" />} triggerVariant="outline" triggerSize="sm"
                        action={addBandAction} hidden={{ scheme: s.name }} fields={bandFields()} submitLabel="Add grade" wide
                      />
                    )}
                  </div>
                  {s.bands.length === 0 ? (
                    <EmptyRow>No grade bands yet.</EmptyRow>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Grade</TableHead>
                          <TableHead>From</TableHead>
                          <TableHead>To</TableHead>
                          <TableHead>Remark</TableHead>
                          {!s.locked && <TableHead className="text-right"><span className="sr-only">Actions</span></TableHead>}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {s.bands.map((b) => (
                          <TableRow key={b.grade}>
                            <TableCell className="font-medium">{b.grade}</TableCell>
                            <TableCell>{num(b.minScore)}</TableCell>
                            <TableCell>{num(b.maxScore)}</TableCell>
                            <TableCell>{b.remark}</TableCell>
                            {!s.locked && (
                              <TableCell className="text-right">
                                <div className="flex flex-wrap justify-end gap-2">
                                  <FormDialog
                                    title={`Edit grade ${b.grade}`} triggerLabel={<><span className="sr-only">Edit grade {b.grade}</span><span aria-hidden="true">Edit</span></>} triggerIcon={<PencilIcon aria-hidden="true" />} triggerVariant="outline" triggerSize="sm"
                                    action={updateBandAction} hidden={{ scheme: s.name, current: b.grade }} fields={bandFields(b)} submitLabel="Save grade" wide
                                  />
                                  <FormDialog
                                    title={`Delete grade ${b.grade}?`} description="Totals in this range will have no grade until another band covers them."
                                    triggerLabel={<><span className="sr-only">Delete grade {b.grade}</span><span aria-hidden="true">Delete</span></>} triggerIcon={<Trash2Icon aria-hidden="true" />} triggerVariant="outline" triggerSize="sm"
                                    action={deleteBandAction} hidden={{ scheme: s.name, grade: b.grade }} submitLabel="Yes, delete" destructive
                                  />
                                </div>
                              </TableCell>
                            )}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </section>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
