import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { ArrowLeftIcon, KeyRoundIcon, LinkIcon, PencilIcon, PowerIcon, Trash2Icon } from "lucide-react"

import { ActiveBadge, EmptyRow, PageHeader, toText } from "@/components/admin/common"
import { FormDialog } from "@/components/admin/form-dialog"
import { assignFields, editTeacherFields } from "@/components/admin/people-fields"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { formatDate } from "@/lib/format"
import { sessionKey } from "@/lib/academic"
import { getPersonOptions, getTeacherDetail } from "@/lib/services/admin"
import { assignTeacherAction, removeAssignmentAction, resetPasswordAction, setAccountActiveAction, updateTeacherAction } from "@/lib/services/admin-people-actions"

export const metadata: Metadata = { title: "Teacher" }

function Detail({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5 py-3 sm:grid sm:grid-cols-[12rem_1fr] sm:gap-4">
      <dt className="type-label text-muted-foreground">{label}</dt>
      <dd className="type-body min-w-0 break-words text-foreground">{value || <span className="text-muted-foreground">Not provided</span>}</dd>
    </div>
  )
}

export default async function AdminTeacherProfilePage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const login = toText((await searchParams).login, 40)
  const [teacher, options] = await Promise.all([getTeacherDetail(login), getPersonOptions()])
  if (!teacher) notFound()

  const key = { kind: "teacher", key: teacher.loginId }
  return (
    <div className="stack-page">
      <Link href="/portal/admin/teachers" className="inline-flex w-fit items-center gap-2 rounded-sm type-label text-primary hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">
        <ArrowLeftIcon className="size-4" aria-hidden="true" />
        All teachers
      </Link>
      <PageHeader title={`${teacher.firstName} ${teacher.lastName}`} description={`Employee number ${teacher.employeeNumber}`}>
        <FormDialog
          title="Edit teacher" description="Update this teacher's details." triggerLabel="Edit" triggerIcon={<PencilIcon aria-hidden="true" />} triggerVariant="outline"
          action={updateTeacherAction} hidden={{ loginId: teacher.loginId }} fields={editTeacherFields(teacher)} submitLabel="Save changes" wide testId="edit-teacher"
        />
        <FormDialog
          title="Reset password" description="Sets a new one-time password and signs this teacher out everywhere. The new password is shown once."
          triggerLabel="Reset password" triggerIcon={<KeyRoundIcon aria-hidden="true" />} triggerVariant="outline"
          action={resetPasswordAction} hidden={key} submitLabel="Reset password" testId="reset-password"
        />
        <FormDialog
          title={teacher.active ? "Deactivate this account?" : "Activate this account?"}
          description={teacher.active ? "The teacher will be signed out and will not be able to sign in until the account is activated again. Their records are kept." : "The teacher will be able to sign in again."}
          triggerLabel={teacher.active ? "Deactivate" : "Activate"} triggerIcon={<PowerIcon aria-hidden="true" />} triggerVariant={teacher.active ? "destructive" : "default"}
          action={setAccountActiveAction} hidden={{ ...key, active: teacher.active ? "false" : "true" }} submitLabel={teacher.active ? "Yes, deactivate" : "Yes, activate"} destructive={teacher.active} testId="toggle-active"
        />
      </PageHeader>

      <Card className="max-w-3xl gap-0">
        <CardHeader className="flex flex-row items-center justify-between gap-3 pb-4">
          <h2 className="type-card-title text-foreground">Details</h2>
          <ActiveBadge active={teacher.active} />
        </CardHeader>
        <CardContent>
          <dl className="divide-y divide-border border-t border-border">
            <Detail label="Login ID" value={<span className="font-mono">{teacher.loginId}</span>} />
            <Detail label="Employee number" value={teacher.employeeNumber} />
            <Detail label="Email" value={teacher.email} />
            <Detail label="Phone" value={teacher.phone} />
            <Detail label="Department" value={teacher.department} />
            <Detail label="Qualification" value={teacher.qualification} />
            <Detail label="Account created" value={formatDate(teacher.createdAt)} />
          </dl>
        </CardContent>
      </Card>

      <section className="flex flex-col gap-3" aria-labelledby="assignments-heading">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 id="assignments-heading" className="type-section-title text-foreground">Classes and subjects</h2>
          <FormDialog
            title="Assign a class and subject" description="Lets this teacher enter results for the class and subject in the current session."
            triggerLabel="Assign class & subject" triggerIcon={<LinkIcon aria-hidden="true" />}
            action={assignTeacherAction} hidden={{ teacherLoginId: teacher.loginId }} fields={assignFields(options)} submitLabel="Save assignment" testId="add-assign"
          />
        </div>
        {teacher.assignments.length === 0 ? (
          <EmptyRow>No classes or subjects assigned yet.</EmptyRow>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Session</TableHead>
                <TableHead>Class</TableHead>
                <TableHead>Subject</TableHead>
                <TableHead className="text-right"><span className="sr-only">Actions</span></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {teacher.assignments.map((a) => (
                <TableRow key={`${a.sessionName}:${a.classKey}:${a.subjectCode}`}>
                  <TableCell className="whitespace-nowrap">{a.sessionName} {a.sessionCurrent && <Badge variant="success">Current</Badge>}</TableCell>
                  <TableCell>{a.classLabel}</TableCell>
                  <TableCell>{a.subjectName} <span className="text-muted-foreground">({a.subjectCode})</span></TableCell>
                  <TableCell className="text-right">
                    <FormDialog
                      title="Remove this assignment?"
                      description={`${teacher.firstName} ${teacher.lastName} will no longer be able to enter ${a.subjectName} results for ${a.classLabel} (${a.sessionName}). Results already entered are kept.`}
                      triggerLabel={<><span className="sr-only">Remove {a.subjectName} for {a.classLabel}</span><span aria-hidden="true">Remove</span></>} triggerIcon={<Trash2Icon aria-hidden="true" />} triggerVariant="outline" triggerSize="sm"
                      action={removeAssignmentAction}
                      hidden={{ teacherLoginId: teacher.loginId, classKey: a.classKey, subjectCode: a.subjectCode, sessionKey: sessionKey(a.sessionName) }}
                      submitLabel="Yes, remove" destructive
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
