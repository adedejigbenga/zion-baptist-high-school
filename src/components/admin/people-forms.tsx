"use client"

import * as React from "react"
import { Dialog } from "@base-ui/react/dialog"
import { AlertCircleIcon, CheckIcon, CopyIcon, KeyRoundIcon, LinkIcon, PlusIcon } from "lucide-react"

import { Alert, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { NativeSelect } from "@/components/ui/native-select"
import { assignTeacherAction, createStudentAction, createTeacherAction, type PeopleState } from "@/lib/services/admin-people-actions"

const initial: PeopleState = { status: "idle" }

type Option = { value: string; label: string }
type FormKind = "student" | "teacher" | "assign"

const ACTIONS = { student: createStudentAction, teacher: createTeacherAction, assign: assignTeacherAction } as const

function Field({ id, label, error, children }: { id: string; label: string; error?: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={id}>{label}</Label>
      {children}
      {error && (
        <p id={`${id}-error`} className="type-caption font-normal text-destructive">
          {error}
        </p>
      )}
    </div>
  )
}

/** Shown once after an account is created: the login ID and the one-time password, with a copy button. */
function Credentials({ loginId, password }: { loginId: string; password: string }) {
  const [copied, setCopied] = React.useState(false)
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(`Login ID: ${loginId}\nPassword: ${password}`)
      setCopied(true)
    } catch {
      // Clipboard can be blocked; the values are on screen to copy by hand.
    }
  }
  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border bg-muted p-4" data-testid="new-credentials">
      <p className="flex items-center gap-2 type-label text-foreground">
        <KeyRoundIcon className="size-4 text-primary" aria-hidden="true" />
        Sign-in details (shown once)
      </p>
      <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 type-body-sm">
        <dt className="text-muted-foreground">Login ID</dt>
        <dd className="font-mono break-all text-foreground">{loginId}</dd>
        <dt className="text-muted-foreground">Password</dt>
        <dd className="font-mono break-all text-foreground">{password}</dd>
      </dl>
      <p className="type-caption font-normal text-muted-foreground">
        Give these to the person now. The password cannot be shown again, and the school should ask them to keep it private.
      </p>
      <Button type="button" variant="outline" size="sm" onClick={copy} className="w-fit">
        {copied ? <CheckIcon aria-hidden="true" /> : <CopyIcon aria-hidden="true" />}
        {copied ? "Copied" : "Copy details"}
      </Button>
    </div>
  )
}

function PersonDialog({
  kind,
  title,
  description,
  buttonLabel,
  icon,
  classes,
  subjects,
  teachers,
}: {
  kind: FormKind
  title: string
  description: string
  buttonLabel: string
  icon: React.ReactNode
  classes: Option[]
  subjects: Option[]
  teachers: Option[]
}) {
  const [open, setOpen] = React.useState(false)
  const [state, action, pending] = React.useActionState(ACTIONS[kind], initial)
  const err = state.fieldErrors ?? {}
  const id = `${kind}`
  const done = state.status === "success"

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
      }}
    >
      <Dialog.Trigger render={<Button type="button" data-testid={`add-${kind}`} />}>
        {icon}
        {buttonLabel}
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-50 bg-brand-950/40 transition-opacity duration-150 data-ending-style:opacity-0 data-starting-style:opacity-0 supports-backdrop-filter:backdrop-blur-xs" />
        <Dialog.Popup className="fixed top-1/2 left-1/2 z-50 max-h-[92dvh] w-[min(34rem,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-xl bg-popover p-6 text-popover-foreground shadow-lg outline-none transition duration-150 data-ending-style:opacity-0 data-starting-style:opacity-0">
          <Dialog.Title className="type-card-title text-foreground">{title}</Dialog.Title>
          <Dialog.Description className="mt-1 type-body-sm text-muted-foreground">{description}</Dialog.Description>

          {done ? (
            <div className="mt-4 flex flex-col gap-4">
              <Alert variant="success" role="status">
                <CheckIcon aria-hidden="true" />
                <AlertTitle>{state.message}</AlertTitle>
              </Alert>
              {state.credentials && <Credentials {...state.credentials} />}
              <div className="flex justify-end">
                <Dialog.Close render={<Button type="button" />}>Done</Dialog.Close>
              </div>
            </div>
          ) : (
            <form action={action} className="mt-4 flex flex-col gap-4" noValidate>
              {state.status === "error" && (
                <Alert variant="destructive" role="alert">
                  <AlertCircleIcon aria-hidden="true" />
                  <AlertTitle>{state.message}</AlertTitle>
                </Alert>
              )}

              {kind === "student" && (
                <>
                  <Field id={`${id}-admission`} label="Admission number" error={err.admissionNumber}>
                    <Input id={`${id}-admission`} name="admissionNumber" placeholder="ZBHS/2026/007" maxLength={40} autoComplete="off" aria-invalid={err.admissionNumber ? true : undefined} aria-describedby={err.admissionNumber ? `${id}-admission-error` : undefined} />
                  </Field>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field id={`${id}-first`} label="First name" error={err.firstName}>
                      <Input id={`${id}-first`} name="firstName" maxLength={60} autoComplete="off" aria-invalid={err.firstName ? true : undefined} />
                    </Field>
                    <Field id={`${id}-last`} label="Last name" error={err.lastName}>
                      <Input id={`${id}-last`} name="lastName" maxLength={60} autoComplete="off" aria-invalid={err.lastName ? true : undefined} />
                    </Field>
                  </div>
                  <Field id={`${id}-class`} label="Class (current session)" error={err.classKey}>
                    <NativeSelect id={`${id}-class`} name="classKey" defaultValue="" aria-invalid={err.classKey ? true : undefined}>
                      <option value="" disabled>Choose a class</option>
                      {classes.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
                    </NativeSelect>
                  </Field>
                </>
              )}

              {kind === "teacher" && (
                <>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field id={`${id}-first`} label="First name" error={err.firstName}>
                      <Input id={`${id}-first`} name="firstName" maxLength={60} autoComplete="off" aria-invalid={err.firstName ? true : undefined} />
                    </Field>
                    <Field id={`${id}-last`} label="Last name" error={err.lastName}>
                      <Input id={`${id}-last`} name="lastName" maxLength={60} autoComplete="off" aria-invalid={err.lastName ? true : undefined} />
                    </Field>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field id={`${id}-login`} label="Login ID" error={err.loginId}>
                      <Input id={`${id}-login`} name="loginId" placeholder="teacher.surname" maxLength={40} autoComplete="off" aria-invalid={err.loginId ? true : undefined} />
                    </Field>
                    <Field id={`${id}-number`} label="Employee number" error={err.employeeNumber}>
                      <Input id={`${id}-number`} name="employeeNumber" placeholder="TCH004" maxLength={40} autoComplete="off" aria-invalid={err.employeeNumber ? true : undefined} />
                    </Field>
                  </div>
                  <Field id={`${id}-department`} label="Department (optional)" error={err.department}>
                    <Input id={`${id}-department`} name="department" maxLength={80} autoComplete="off" />
                  </Field>
                </>
              )}

              {kind === "assign" && (
                <>
                  <Field id={`${id}-teacher`} label="Teacher" error={err.teacherLoginId}>
                    <NativeSelect id={`${id}-teacher`} name="teacherLoginId" defaultValue="" aria-invalid={err.teacherLoginId ? true : undefined}>
                      <option value="" disabled>Choose a teacher</option>
                      {teachers.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                    </NativeSelect>
                  </Field>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field id={`${id}-class`} label="Class" error={err.classKey}>
                      <NativeSelect id={`${id}-class`} name="classKey" defaultValue="" aria-invalid={err.classKey ? true : undefined}>
                        <option value="" disabled>Choose a class</option>
                        {classes.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
                      </NativeSelect>
                    </Field>
                    <Field id={`${id}-subject`} label="Subject" error={err.subjectCode}>
                      <NativeSelect id={`${id}-subject`} name="subjectCode" defaultValue="" aria-invalid={err.subjectCode ? true : undefined}>
                        <option value="" disabled>Choose a subject</option>
                        {subjects.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                      </NativeSelect>
                    </Field>
                  </div>
                </>
              )}

              {kind !== "assign" && (
                <p className="type-caption font-normal text-muted-foreground">
                  A one-time password is generated for the new account and shown once after you save.
                </p>
              )}
              <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <Dialog.Close render={<Button type="button" variant="outline" />}>Cancel</Dialog.Close>
                <Button type="submit" loading={pending}>{kind === "assign" ? "Save assignment" : "Create account"}</Button>
              </div>
            </form>
          )}
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

/** Buttons shown on the Students page. */
function AddStudentButton({ classes }: { classes: Option[] }) {
  return (
    <PersonDialog
      kind="student"
      title="Add a student"
      description="Creates the student's account and enrols them in a class for the current session."
      buttonLabel="Add student"
      icon={<PlusIcon aria-hidden="true" />}
      classes={classes}
      subjects={[]}
      teachers={[]}
    />
  )
}

/** Buttons shown on the Teachers page. */
function TeacherButtons({ classes, subjects, teachers }: { classes: Option[]; subjects: Option[]; teachers: Option[] }) {
  return (
    <>
      <PersonDialog
        kind="teacher"
        title="Add a teacher"
        description="Creates the teacher's account. Give them classes and subjects afterwards."
        buttonLabel="Add teacher"
        icon={<PlusIcon aria-hidden="true" />}
        classes={[]}
        subjects={[]}
        teachers={[]}
      />
      <PersonDialog
        kind="assign"
        title="Assign a class and subject"
        description="Lets the teacher enter results for this class and subject in the current session."
        buttonLabel="Assign class & subject"
        icon={<LinkIcon aria-hidden="true" />}
        classes={classes}
        subjects={subjects}
        teachers={teachers}
      />
    </>
  )
}

export { AddStudentButton, TeacherButtons }
