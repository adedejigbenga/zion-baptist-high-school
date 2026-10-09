import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { ArrowLeftIcon, LinkIcon, PencilIcon, PlusIcon, Trash2Icon } from "lucide-react"

import { ActiveBadge, EmptyRow, PageHeader, toText } from "@/components/admin/common"
import { FormDialog } from "@/components/admin/form-dialog"
import { subjectFields } from "@/components/admin/structure-fields"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { getPersonOptions, getSubjectDetail } from "@/lib/services/admin"
import { assignTeacherAction, removeAssignmentAction } from "@/lib/services/admin-people-actions"
import { addSubjectToClassAction, removeSubjectFromClassAction, updateSubjectAction } from "@/lib/services/admin-structure-actions"

export const metadata: Metadata = { title: "Subject" }

export default async function AdminSubjectViewPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const code = toText((await searchParams).code, 20)
  const [subject, options] = await Promise.all([getSubjectDetail(code), getPersonOptions()])
  if (!subject) notFound()

  const session = options.sessions.find((s) => s.current)
  const offeredIn = new Set(subject.classes.map((c) => c.key))
  const classChoices = options.classes.filter((c) => !offeredIn.has(c.key))

  return (
    <div className="stack-page">
      <Link href="/portal/admin/subjects" className="inline-flex w-fit items-center gap-2 rounded-sm type-label text-primary hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">
        <ArrowLeftIcon className="size-4" aria-hidden="true" />
        All subjects
      </Link>
      <PageHeader title={subject.name} description={`Code ${subject.code}${subject.description ? ` · ${subject.description}` : ""}`}>
        <ActiveBadge active={subject.active} />
        <FormDialog
          testId="edit-subject" title="Edit subject" description="The subject code cannot be changed."
          triggerLabel="Edit" triggerIcon={<PencilIcon aria-hidden="true" />} triggerVariant="outline"
          action={updateSubjectAction} hidden={{ code: subject.code }} fields={subjectFields(subject)} submitLabel="Save changes"
        />
      </PageHeader>

      <section className="flex flex-col gap-3" aria-labelledby="classes-heading">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 id="classes-heading" className="type-section-title text-foreground">Classes offering this subject{subject.sessionName ? ` (${subject.sessionName})` : ""}</h2>
          <div className="flex flex-wrap gap-2">
            <FormDialog
              testId="add-subject-class" title={`Offer ${subject.name} in a class`} description="Adds the subject to the class for the current session."
              triggerLabel="Add to a class" triggerIcon={<PlusIcon aria-hidden="true" />} triggerVariant="outline"
              action={addSubjectToClassAction} hidden={{ subjectCode: subject.code }}
              fields={[{ name: "classKey", label: "Class", kind: "select", placeholder: "Choose a class", options: classChoices.map((c) => ({ value: c.key, label: c.label })) }]}
              submitLabel="Add to class"
            />
            <FormDialog
              testId="add-assign" title={`Assign a teacher to ${subject.name}`} description="Choose the teacher and the class. The class will offer the subject if it does not already."
              triggerLabel="Assign teacher" triggerIcon={<LinkIcon aria-hidden="true" />}
              action={assignTeacherAction} hidden={{ subjectCode: subject.code }}
              fields={[
                { name: "teacherLoginId", label: "Teacher", kind: "select", placeholder: "Choose a teacher", options: options.teachers.map((t) => ({ value: t.loginId, label: `${t.name} (${t.loginId})` })) },
                { name: "classKey", label: "Class", kind: "select", placeholder: "Choose a class", options: options.classes.map((c) => ({ value: c.key, label: c.label })) },
              ]}
              submitLabel="Save assignment"
            />
          </div>
        </div>
        {subject.classes.length === 0 ? (
          <EmptyRow>No class offers this subject yet.</EmptyRow>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Class</TableHead>
                <TableHead>Teachers</TableHead>
                <TableHead className="text-right"><span className="sr-only">Actions</span></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {subject.classes.map((c) => (
                <TableRow key={c.key}>
                  <TableCell className="font-medium">
                    <Link href={`/portal/admin/classes/view?class=${encodeURIComponent(c.key)}`} className="rounded-sm text-primary hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">{c.label}</Link>
                  </TableCell>
                  <TableCell>
                    {c.teachers.length === 0 ? (
                      <span className="text-muted-foreground">No teacher yet</span>
                    ) : (
                      <ul className="flex flex-col gap-1">
                        {c.teachers.map((t) => (
                          <li key={t.loginId} className="flex flex-wrap items-center gap-2">
                            <Link href={`/portal/admin/teachers/profile?login=${encodeURIComponent(t.loginId)}`} className="rounded-sm text-primary hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">{t.name}</Link>
                            <FormDialog
                              title="Remove this teacher?" description={`${t.name} will no longer be able to enter ${subject.name} results for ${c.label}. Results already entered are kept.`}
                              triggerLabel={<><span className="sr-only">Remove {t.name} from {c.label}</span><span aria-hidden="true">Remove</span></>} triggerIcon={<Trash2Icon aria-hidden="true" />} triggerVariant="outline" triggerSize="sm"
                              action={removeAssignmentAction} hidden={{ teacherLoginId: t.loginId, classKey: c.key, subjectCode: subject.code, sessionKey: session?.key ?? "" }} submitLabel="Yes, remove" destructive
                            />
                          </li>
                        ))}
                      </ul>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <FormDialog
                      title={`Remove ${subject.name} from ${c.label}?`} description="Its teacher assignments for this class are removed too. This is refused if results have already been entered for it."
                      triggerLabel={<><span className="sr-only">Remove from {c.label}</span><span aria-hidden="true">Remove from class</span></>} triggerIcon={<Trash2Icon aria-hidden="true" />} triggerVariant="outline" triggerSize="sm"
                      action={removeSubjectFromClassAction} hidden={{ classKey: c.key, subjectCode: subject.code }} submitLabel="Yes, remove" destructive
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </section>
    </div>
  )
}
