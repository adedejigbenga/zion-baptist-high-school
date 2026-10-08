"use client"

import * as React from "react"
import { AlertDialog } from "@base-ui/react/alert-dialog"

import { Button } from "@/components/ui/button"

/**
 * A confirmation dialog whose confirm button is a real submit button for the form named by `formId`
 * (via the form attribute), so confirming runs the same Server Action as any other submit. The dialog stays open while the
 * request runs; the parent closes it (open / onOpenChange) when the action answers.
 */
function ConfirmDialog({
  open,
  onOpenChange,
  trigger,
  triggerLabel,
  title,
  description,
  confirmLabel,
  cancelLabel = "Cancel",
  formId,
  pending,
  destructive = false,
  children,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  trigger: React.ReactElement
  triggerLabel: React.ReactNode
  title: string
  description: React.ReactNode
  confirmLabel: string
  cancelLabel?: string
  formId: string
  pending: boolean
  destructive?: boolean
  /** Extra fields (e.g. a reason). Give each `form={formId}`, because the dialog renders outside the form. */
  children?: React.ReactNode
}) {
  return (
    <AlertDialog.Root open={open} onOpenChange={onOpenChange}>
      <AlertDialog.Trigger render={trigger}>{triggerLabel}</AlertDialog.Trigger>
      <AlertDialog.Portal>
        <AlertDialog.Backdrop className="fixed inset-0 z-50 bg-brand-950/40 transition-opacity duration-150 data-ending-style:opacity-0 data-starting-style:opacity-0 supports-backdrop-filter:backdrop-blur-xs" />
        <AlertDialog.Popup className="fixed top-1/2 left-1/2 z-50 flex max-h-[90dvh] w-[min(30rem,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 flex-col gap-4 overflow-y-auto rounded-xl bg-popover p-6 text-popover-foreground shadow-lg outline-none transition duration-150 data-ending-style:opacity-0 data-starting-style:opacity-0">
          <AlertDialog.Title className="type-card-title text-foreground">{title}</AlertDialog.Title>
          <AlertDialog.Description render={<div />} className="type-body-sm text-muted-foreground">
            {description}
          </AlertDialog.Description>
          {children}
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <AlertDialog.Close render={<Button type="button" variant="outline" />}>{cancelLabel}</AlertDialog.Close>
            <Button type="submit" form={formId} variant={destructive ? "destructive" : "default"} loading={pending}>
              {confirmLabel}
            </Button>
          </div>
        </AlertDialog.Popup>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  )
}

export { ConfirmDialog }
