"use client"

import * as React from "react"
import { AlertCircleIcon, CheckCircle2Icon, EyeIcon, EyeOffIcon } from "lucide-react"

import { ConfirmDialog } from "@/components/admin/confirm-dialog"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { publishResultAction, unpublishResultAction, type ActionState } from "@/lib/services/admin-actions"
import type { ResultStatus } from "@/generated/prisma/enums"

const initial: ActionState = { status: "idle" }

/**
 * Publish / unpublish controls. The buttons only choose what to ask for: the server re-checks the ADMIN role, re-evaluates
 * completeness inside the publishing transaction, and ignores anything this component believes about the result.
 */
function ResultActions({
  admission,
  termKey,
  studentName,
  status,
  canPublish,
}: {
  admission: string
  termKey: string
  studentName: string
  status: ResultStatus
  canPublish: boolean
}) {
  const [publishOpen, setPublishOpen] = React.useState(false)
  const [unpublishOpen, setUnpublishOpen] = React.useState(false)
  // The dialog closes as soon as the server has answered (success or error); the answer is shown on the page.
  const [publishState, publishAction, publishing] = React.useActionState(async (previous: ActionState, formData: FormData) => {
    const next = await publishResultAction(previous, formData)
    setPublishOpen(false)
    return next
  }, initial)
  const [unpublishState, unpublishAction, unpublishing] = React.useActionState(async (previous: ActionState, formData: FormData) => {
    const next = await unpublishResultAction(previous, formData)
    setUnpublishOpen(false)
    return next
  }, initial)

  const state = publishState.at && (!unpublishState.at || publishState.at > unpublishState.at) ? publishState : unpublishState

  return (
    <div className="flex flex-col gap-4">
      <div aria-live="polite" className="flex flex-col gap-3">
        {state.status === "success" && (
          <Alert variant="success" role="status" data-testid="action-success">
            <CheckCircle2Icon aria-hidden="true" />
            <AlertTitle>Done</AlertTitle>
            <AlertDescription>{state.message}</AlertDescription>
          </Alert>
        )}
        {state.status === "error" && (
          <Alert variant="destructive" data-testid="action-error">
            <AlertCircleIcon aria-hidden="true" />
            <AlertTitle>{state.message}</AlertTitle>
            {state.issues && state.issues.length > 0 && (
              <AlertDescription>
                <ul className="list-disc pl-5">{state.issues.map((i) => <li key={i}>{i}</li>)}</ul>
              </AlertDescription>
            )}
          </Alert>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        {status !== "PUBLISHED" && (
          <>
            <form id="publish-form" action={publishAction}>
              <input type="hidden" name="admission" value={admission} />
              <input type="hidden" name="termKey" value={termKey} />
            </form>
            <ConfirmDialog
              open={publishOpen}
              onOpenChange={setPublishOpen}
              trigger={<Button type="button" disabled={!canPublish} data-testid="publish-button" />}
              triggerLabel={<><EyeIcon aria-hidden="true" />Publish result</>}
              title="Publish this result?"
              description={
                <>
                  <p>Once published, the student will be able to view this result in their portal.</p>
                  <p className="mt-2">This will publish the result for {studentName} ({admission}).</p>
                </>
              }
              confirmLabel="Yes, publish"
              formId="publish-form"
              pending={publishing}
            />
          </>
        )}

        {status === "PUBLISHED" && (
          <>
            <form id="unpublish-form" action={unpublishAction}>
              <input type="hidden" name="admission" value={admission} />
              <input type="hidden" name="termKey" value={termKey} />
            </form>
            <ConfirmDialog
              open={unpublishOpen}
              onOpenChange={setUnpublishOpen}
              trigger={<Button type="button" variant="outline" data-testid="unpublish-button" />}
              triggerLabel={<><EyeOffIcon aria-hidden="true" />Unpublish result</>}
              title="Unpublish this result?"
              description={<p>{studentName} will no longer be able to see this result and will see “Result Upload in Progress” instead. No scores are deleted, and you can publish it again later.</p>}
              confirmLabel="Yes, unpublish"
              formId="unpublish-form"
              pending={unpublishing}
              destructive
            >
              <div className="flex flex-col gap-2">
                <Label htmlFor="unpublish-reason">Reason (recorded in the audit log)</Label>
                <Textarea id="unpublish-reason" name="reason" form="unpublish-form" required minLength={3} maxLength={300} rows={3} />
              </div>
            </ConfirmDialog>
          </>
        )}
      </div>
    </div>
  )
}

export { ResultActions }
