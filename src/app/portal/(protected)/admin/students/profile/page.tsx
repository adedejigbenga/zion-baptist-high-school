import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { ArrowLeftIcon, KeyRoundIcon, PencilIcon, PowerIcon, SchoolIcon } from "lucide-react"

import { ActiveBadge, EmptyRow, PageHeader, toText } from "@/components/admin/common"
import { FormDialog } from "@/components/admin/form-dialog"
import { editStudentFields, enrollFields } from "@/components/admin/people-fields"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { formatDate } from "@/lib/format"
import { getPersonOptions, getStudentDetail } from "@/lib/services/admin"
import { enrollStudentAction, resetPasswordAction, setAccountActiveAction, updateStudentAction } from "@/lib/services/admin-people-actions"

export const metadata: Metadata = { title: "Student" }

function Detail({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5 py-3 sm:grid sm:grid-cols-[12rem_1fr] sm:gap-4">
      <dt className="type-label text-muted-foreground">{label}</dt>
      <dd className="type-body min-w-0 break-words text-foreground">{value || <span className="text-muted-foreground">Not provided</span>}</dd>
    </div>
  )
}

export default async function AdminStudentProfilePage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const admission = toText((await searchParams).admission, 40)
  const [student, options] = await Promise.all([getStudentDetail(admission), getPersonOptions()])
  if (!student) notFound()

  const key = { kind: "student", key: student.admissionNumber }
  return (
    <div className="stack-page">
      <Link href="/portal/admin/students" className="inline-flex w-fit items-center gap-2 rounded-sm type-label text-primary hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">
        <ArrowLeftIcon className="size-4" aria-hidden="true" />
        All students
      </Link>
      <PageHeader title={`${student.firstName} ${student.lastName}`} description={`Admission number ${student.admissionNumber}`}>
        <FormDialog
          title="Edit student" description="Update this student's details." triggerLabel="Edit" triggerIcon={<PencilIcon aria-hidden="true" />} triggerVariant="outline"
          action={updateStudentAction} hidden={{ admissionNumber: student.admissionNumber }} fields={editStudentFields(student)} submitLabel="Save changes" wide testId="edit-student"
        />
        <FormDialog
          title="Enrol or move to a class" description="A student has one class per session. Choosing a class for a session they already have moves them, unless they already have results in that session."
          triggerLabel="Enrol / move" triggerIcon={<SchoolIcon aria-hidden="true" />} triggerVariant="outline"
          action={enrollStudentAction} hidden={{ admissionNumber: student.admissionNumber }} fields={enrollFields(options)} submitLabel="Save enrolment" testId="enroll-student"
        />
        <FormDialog
          title="Reset password" description="Sets a new one-time password and signs this student out everywhere. The new password is shown once."
          triggerLabel="Reset password" triggerIcon={<KeyRoundIcon aria-hidden="true" />} triggerVariant="outline"
          action={resetPasswordAction} hidden={key} submitLabel="Reset password" testId="reset-password"
        />
        <FormDialog
          title={student.active ? "Deactivate this account?" : "Activate this account?"}
          description={student.active ? "The student will be signed out and will not be able to sign in until the account is activated again. Their records and results are kept." : "The student will be able to sign in again."}
          triggerLabel={student.active ? "Deactivate" : "Activate"} triggerIcon={<PowerIcon aria-hidden="true" />} triggerVariant={student.active ? "destructive" : "default"}
          action={setAccountActiveAction} hidden={{ ...key, active: student.active ? "false" : "true" }} submitLabel={student.active ? "Yes, deactivate" : "Yes, activate"} destructive={student.active} testId="toggle-active"
        />
      </PageHeader>

      <Card className="max-w-3xl gap-0">
        <CardHeader className="flex flex-row items-center justify-between gap-3 pb-4">
          <h2 className="type-card-title text-foreground">Details</h2>
          <ActiveBadge active={student.active} />
        </CardHeader>
        <CardContent>
          <dl className="divide-y divide-border border-t border-border">
            <Detail label="Login ID" value={<span className="font-mono">{student.admissionNumber}</span>} />
            <Detail label="Email" value={student.email} />
            <Detail label="Phone" value={student.phone} />
            <Detail label="Gender" value={student.gender ? (student.gender === "MALE" ? "Male" : "Female") : null} />
            <Detail label="Date of birth" value={student.dateOfBirth ? formatDate(student.dateOfBirth) : null} />
            <Detail label="Guardian" value={student.guardianName} />
            <Detail label="Guardian phone" value={student.guardianPhone} />
            <Detail label="Address" value={student.address} />
            <Detail label="Account created" value={formatDate(student.createdAt)} />
          </dl>
        </CardContent>
      </Card>

      <section className="flex flex-col gap-3" aria-labelledby="enrolment-heading">
        <h2 id="enrolment-heading" className="type-section-title text-foreground">Enrolment history</h2>
        {student.enrollments.length === 0 ? (
          <EmptyRow>This student is not enrolled in any class yet.</EmptyRow>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Session</TableHead>
                <TableHead>Class</TableHead>
                <TableHead className="text-right">Results</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {student.enrollments.map((e) => (
                <TableRow key={e.sessionName}>
                  <TableCell className="whitespace-nowrap">{e.sessionName} {e.sessionCurrent && <Badge variant="success">Current</Badge>}</TableCell>
                  <TableCell>{e.classLabel}</TableCell>
                  <TableCell className="text-right">{e.resultCount}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </section>
    </div>
  )
}
