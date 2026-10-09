import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { ArrowLeftIcon, LinkIcon, PencilIcon, PlusIcon, Trash2Icon } from "lucide-react"

import { ActiveBadge, EmptyRow, PageHeader, toText } from "@/components/admin/common"
import { FormDialog } from "@/components/admin/form-dialog"
import { assignFields } from "@/components/admin/people-fields"
import { classFields } from "@/components/admin/structure-fields"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { getClassDetail, getPersonOptions } from "@/lib/services/admin"
import { assignTeacherAction, removeAssignmentAction } from "@/lib/services/admin-people-actions"
import { addSubjectToClassAction, removeSubjectFromClassAction, updateClassAction } from "@/lib/services/admin-structure-actions"

export const metadata: Metadata = { title: "Class" }

export default async function AdminClassViewPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const key = toText((await searchParams).class, 40)
  const [klass, options] = await Promise.all([getClassDetail(key), getPersonOptions()])
  if (!klass) notFound()

  const session = options.sessions.find((s) => s.current)
  const offered = new Set(klass.subjects.map((s) => s.code))
  const availableSubjects = options.subjects.filter((s) => !offered.has(s.code))

  return (
    <div className="stack-page">
      <Link href="/portal/admin/classes" className="inline-flex w-fit items-center gap-2 rounded-sm type-label text-primary hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">
        <ArrowLeftIcon className="size-4" aria-hidden="true" />
        All classes
      </Link>
      <PageHeader title={klass.label} description={klass.sessionName ? `Level ${klass.level} · ${klass.sessionName}` : `Level ${klass.level}`}>
        <ActiveBadge active={klass.active} />
        <FormDialog
          testId="edit-class" title="Edit class" description="Changing the name or section changes how the class is shown everywhere."
          triggerLabel="Edit" triggerIcon={<PencilIcon aria-hidden="true" />} triggerVariant="outline"
          action={updateClassAction} hidden={{ classKey: klass.key }} fields={classFields(klass)} submitLabel="Save changes"
        />
      </PageHeader>

      <section className="flex flex-col gap-3" aria-labelledby="subjects-heading">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 id="subjects-heading" className="type-section-title text-foreground">Subjects and teachers</h2>
          <div className="flex flex-wrap gap-2">
            <FormDialog
              testId="add-class-subject" title="Add a subject to this class" description={`The class will offer the subject in ${klass.sessionName ?? "the current session"}.`}
              triggerLabel="Add subject" triggerIcon={<PlusIcon aria-hidden="true" />} triggerVariant="outline"
              action={addSubjectToClassAction} hidden={{ classKey: klass.key }}
              fields={[{ name: "subjectCode", label: "Subject", kind: "select", placeholder: "Choose a subject", options: availableSubjects.map((s) => ({ value: s.code, label: `${s.name} (${s.code})` })) }]}
              submitLabel="Add subject"
            />
            <FormDialog
              testId="add-assign" title={`Assign a teacher to ${klass.label}`} description="Lets the teacher enter results for the subject in this class."
              triggerLabel="Assign teacher" triggerIcon={<LinkIcon aria-hidden="true" />}
              action={assignTeacherAction} hidden={{ classKey: klass.key }}
              fields={assignFields(options, { teacher: true }).filter((f) => f.name !== "classKey")} submitLabel="Save assignment"
            />
          </div>
        </div>
        {klass.subjects.length === 0 ? (
          <EmptyRow>This class does not offer any subjects yet.</EmptyRow>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Subject</TableHead>
                <TableHead>Teachers</TableHead>
                <TableHead className="text-right"><span className="sr-only">Actions</span></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {klass.subjects.map((s) => (
                <TableRow key={s.code}>
                  <TableCell className="font-medium">{s.name} <span className="text-muted-foreground">({s.code})</span></TableCell>
                  <TableCell>
                    {s.teachers.length === 0 ? (
                      <span className="text-muted-foreground">No teacher yet</span>
                    ) : (
                      <ul className="flex flex-col gap-1">
                        {s.teachers.map((t) => (
                          <li key={t.loginId} className="flex flex-wrap items-center gap-2">
                            <Link href={`/portal/admin/teachers/profile?login=${encodeURIComponent(t.loginId)}`} className="rounded-sm text-primary hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">{t.name}</Link>
                            <FormDialog
                              title="Remove this teacher?" description={`${t.name} will no longer be able to enter ${s.name} results for ${klass.label}. Results already entered are kept.`}
                              triggerLabel={<><span className="sr-only">Remove {t.name} from {s.name}</span><span aria-hidden="true">Remove</span></>} triggerIcon={<Trash2Icon aria-hidden="true" />} triggerVariant="outline" triggerSize="sm"
                              action={removeAssignmentAction} hidden={{ teacherLoginId: t.loginId, classKey: klass.key, subjectCode: s.code, sessionKey: session?.key ?? "" }} submitLabel="Yes, remove" destructive
                            />
                          </li>
                        ))}
                      </ul>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <FormDialog
                      title={`Remove ${s.name} from ${klass.label}?`} description="Its teacher assignments for this class are removed too. This is refused if results have already been entered for it."
                      triggerLabel={<><span className="sr-only">Remove subject {s.name}</span><span aria-hidden="true">Remove subject</span></>} triggerIcon={<Trash2Icon aria-hidden="true" />} triggerVariant="outline" triggerSize="sm"
                      action={removeSubjectFromClassAction} hidden={{ classKey: klass.key, subjectCode: s.code }} submitLabel="Yes, remove subject" destructive
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </section>

      <Card className="gap-0">
        <CardHeader className="pb-4"><h2 className="type-card-title text-foreground">Students ({klass.students.length})</h2></CardHeader>
        <CardContent>
          {klass.students.length === 0 ? (
            <p className="type-body-sm text-muted-foreground">No students are enrolled in this class for the current session.</p>
          ) : (
            <ul className="grid gap-x-6 gap-y-1 sm:grid-cols-2 lg:grid-cols-3">
              {klass.students.map((s) => (
                <li key={s.admissionNumber} className="py-1 type-body-sm">
                  <Link href={`/portal/admin/students/profile?admission=${encodeURIComponent(s.admissionNumber)}`} className="rounded-sm text-primary hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">{s.name}</Link>
                  <span className="text-muted-foreground"> · {s.admissionNumber}{s.active ? "" : " (inactive)"}</span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
