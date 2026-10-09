"use client"

import * as React from "react"
import { Dialog } from "@base-ui/react/dialog"
import { AlertCircleIcon, CheckIcon, CopyIcon, KeyRoundIcon } from "lucide-react"

import { Alert, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { NativeSelect } from "@/components/ui/native-select"
import { Textarea } from "@/components/ui/textarea"
import type { ManageState } from "@/types/manage"

/**
 * One reusable dialog for every admin write: a title, optional fields, a Server Action, and a result view.
 * It also serves as the confirmation dialog for a plain action (no fields: just the description and a confirm button).
 *
 * The browser only ever sends what the form shows plus the `hidden` keys the page chose (class key, subject code, ...).
 * It never sends a user ID or role, and the Server Action re-validates everything.
 */

export type FieldSpec = {
  name: string
  label: string
  kind?: "text" | "email" | "tel" | "date" | "number" | "select" | "textarea" | "checkbox"
  options?: { value: string; label: string }[]
  /** For select: show a disabled "Choose…" first entry. */
  placeholder?: string
  defaultValue?: string
  hint?: string
  maxLength?: number
  step?: string
  min?: string
  max?: string
  /** Put two fields side by side on wide screens. */
  half?: boolean
}

type Action = (previous: ManageState, formData: FormData) => Promise<ManageState>

const initial: ManageState = { status: "idle" }

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
        Give these to the person now. The password cannot be shown again; they should keep it private.
      </p>
      <Button type="button" variant="outline" size="sm" onClick={copy} className="w-fit">
        {copied ? <CheckIcon aria-hidden="true" /> : <CopyIcon aria-hidden="true" />}
        {copied ? "Copied" : "Copy details"}
      </Button>
    </div>
  )
}

function FieldView({ field, id, error }: { field: FieldSpec; id: string; error?: string }) {
  const kind = field.kind ?? "text"
  const describedBy = error ? `${id}-error` : field.hint ? `${id}-hint` : undefined
  const common = { id, name: field.name, "aria-invalid": error ? true : undefined, "aria-describedby": describedBy }

  if (kind === "checkbox") {
    return (
      <div className="flex flex-col gap-1">
        <label htmlFor={id} className="flex items-center gap-2 type-body-sm text-foreground">
          <input type="checkbox" id={id} name={field.name} value="true" defaultChecked={field.defaultValue === "true"} className="size-4 rounded border-input accent-primary" />
          {field.label}
        </label>
        {field.hint && <p id={`${id}-hint`} className="type-caption font-normal text-muted-foreground">{field.hint}</p>}
      </div>
    )
  }
  return (
    <div className={`flex flex-col gap-2 ${field.half ? "" : "sm:col-span-2"}`}>
      <Label htmlFor={id}>{field.label}</Label>
      {kind === "select" ? (
        <NativeSelect {...common} defaultValue={field.defaultValue ?? ""}>
          {field.placeholder && <option value="" disabled={!field.options?.some((o) => o.value === "")}>{field.placeholder}</option>}
          {field.options?.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </NativeSelect>
      ) : kind === "textarea" ? (
        <Textarea {...common} defaultValue={field.defaultValue ?? ""} rows={3} maxLength={field.maxLength} />
      ) : (
        <Input {...common} type={kind} defaultValue={field.defaultValue ?? ""} maxLength={field.maxLength} step={field.step} min={field.min} max={field.max} autoComplete="off" inputMode={kind === "number" ? "decimal" : undefined} />
      )}
      {field.hint && !error && <p id={`${id}-hint`} className="type-caption font-normal text-muted-foreground">{field.hint}</p>}
      {error && <p id={`${id}-error`} className="type-caption font-normal text-destructive">{error}</p>}
    </div>
  )
}

function Body({
  action, fields, hidden, submitLabel, destructive, onDone, idBase,
}: {
  action: Action
  fields: FieldSpec[]
  hidden: Record<string, string>
  submitLabel: string
  destructive: boolean
  onDone: React.ReactNode
  idBase: string
}) {
  const [state, formAction, pending] = React.useActionState(action, initial)
  const err = state.fieldErrors ?? {}

  if (state.status === "success") {
    return (
      <div className="mt-4 flex flex-col gap-4">
        <Alert variant="success" role="status" data-testid="manage-success">
          <CheckIcon aria-hidden="true" />
          <AlertTitle>{state.message}</AlertTitle>
        </Alert>
        {state.credentials && <Credentials {...state.credentials} />}
        <div className="flex justify-end">{onDone}</div>
      </div>
    )
  }

  return (
    <form action={formAction} className="mt-4 flex flex-col gap-4" noValidate>
      {Object.entries(hidden).map(([k, v]) => <input key={k} type="hidden" name={k} value={v} />)}
      {state.status === "error" && (
        <Alert variant="destructive" role="alert" data-testid="manage-error">
          <AlertCircleIcon aria-hidden="true" />
          <AlertTitle>{state.message}</AlertTitle>
        </Alert>
      )}
      {fields.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2">
          {fields.map((f) => <FieldView key={f.name} field={f} id={`${idBase}-${f.name}`} error={err[f.name]} />)}
        </div>
      )}
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Dialog.Close render={<Button type="button" variant="outline" />}>Cancel</Dialog.Close>
        <Button type="submit" variant={destructive ? "destructive" : "default"} loading={pending}>{submitLabel}</Button>
      </div>
    </form>
  )
}

function FormDialog({
  title, description, triggerLabel, triggerIcon, triggerVariant = "default", triggerSize = "default", triggerDisabled = false,
  action, fields = [], hidden = {}, submitLabel = "Save", destructive = false, testId, wide = false,
}: {
  title: string
  description?: React.ReactNode
  triggerLabel: React.ReactNode
  triggerIcon?: React.ReactNode
  triggerVariant?: "default" | "outline" | "destructive"
  triggerSize?: "default" | "sm"
  /** Keep the dialog mounted (so its result stays visible) even when the action stops being available. */
  triggerDisabled?: boolean
  action: Action
  fields?: FieldSpec[]
  hidden?: Record<string, string>
  submitLabel?: string
  destructive?: boolean
  testId?: string
  wide?: boolean
}) {
  const [open, setOpen] = React.useState(false)
  // A fresh form (and result view) every time the dialog is opened.
  const [generation, setGeneration] = React.useState(0)
  const idBase = React.useId().replace(/:/g, "")

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        if (!next) setGeneration((g) => g + 1)
      }}
    >
      <Dialog.Trigger render={<Button type="button" variant={triggerVariant} size={triggerSize} data-testid={testId} disabled={triggerDisabled} />}>
        {triggerIcon}
        {triggerLabel}
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-50 bg-brand-950/40 transition-opacity duration-150 data-ending-style:opacity-0 data-starting-style:opacity-0 supports-backdrop-filter:backdrop-blur-xs" />
        <Dialog.Popup
          className={`fixed top-1/2 left-1/2 z-50 max-h-[92dvh] ${wide ? "w-[min(40rem,calc(100vw-2rem))]" : "w-[min(34rem,calc(100vw-2rem))]"} -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-xl bg-popover p-6 text-popover-foreground shadow-lg outline-none transition duration-150 data-ending-style:opacity-0 data-starting-style:opacity-0`}
        >
          <Dialog.Title className="type-card-title text-foreground">{title}</Dialog.Title>
          {description && <Dialog.Description className="mt-1 type-body-sm text-muted-foreground">{description}</Dialog.Description>}
          <Body
            key={generation}
            action={action}
            fields={fields}
            hidden={hidden}
            submitLabel={submitLabel}
            destructive={destructive}
            idBase={idBase}
            onDone={<Dialog.Close render={<Button type="button" />}>Done</Dialog.Close>}
          />
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

export { FormDialog }
