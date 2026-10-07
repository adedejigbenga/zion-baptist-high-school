"use client"

import * as React from "react"
import { AlertDialog } from "@base-ui/react/alert-dialog"
import { SendIcon } from "lucide-react"

import { Button } from "@/components/ui/button"

/**
 * Confirmation before the final submission. The confirm button is a real submit button for the results form
 * (via the form attribute), so submitting works through the same Server Action as Save Draft.
 */
function ConfirmSubmitDialog({
  formId,
  disabled,
  pending,
  studentCount,
  subjectName,
  className,
}: {
  formId: string
  disabled: boolean
  pending: boolean
  studentCount: number
  subjectName: string
  className: string
}) {
  const [open, setOpen] = React.useState(false)

  return (
    <AlertDialog.Root open={open} onOpenChange={setOpen}>
      <AlertDialog.Trigger render={<Button type="button" disabled={disabled} />}>
        <SendIcon aria-hidden="true" />
        Submit Result
      </AlertDialog.Trigger>
      <AlertDialog.Portal>
        <AlertDialog.Backdrop className="fixed inset-0 z-50 bg-brand-950/40 transition-opacity duration-150 data-ending-style:opacity-0 data-starting-style:opacity-0 supports-backdrop-filter:backdrop-blur-xs" />
        <AlertDialog.Popup className="fixed top-1/2 left-1/2 z-50 flex w-[min(28rem,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 flex-col gap-4 rounded-xl bg-popover p-6 text-popover-foreground shadow-lg outline-none transition duration-150 data-ending-style:opacity-0 data-starting-style:opacity-0">
          <AlertDialog.Title className="type-card-title text-foreground">Submit {subjectName} results?</AlertDialog.Title>
          <AlertDialog.Description className="type-body-sm text-muted-foreground">
            You are about to submit {subjectName} results for {studentCount} {studentCount === 1 ? "student" : "students"} in {className}.
            Once submitted you will not be able to change these scores, and they will wait for administrative publication.
            Students will not see them until an administrator publishes them.
          </AlertDialog.Description>
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <AlertDialog.Close render={<Button type="button" variant="outline" />}>Keep editing</AlertDialog.Close>
            <Button type="submit" form={formId} name="intent" value="submit" loading={pending} onClick={() => setOpen(false)}>
              Yes, submit result
            </Button>
          </div>
        </AlertDialog.Popup>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  )
}

export { ConfirmSubmitDialog }
