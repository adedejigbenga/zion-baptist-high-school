"use client"

import * as React from "react"
import { Dialog } from "@base-ui/react/dialog"
import { AlertCircleIcon, CheckCircle2Icon, EyeIcon, EyeOffIcon, MegaphoneIcon, PencilIcon, PlusIcon } from "lucide-react"

import { AnnouncementStateBadge } from "@/components/admin/common"
import { Alert, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { NativeSelect } from "@/components/ui/native-select"
import { Textarea } from "@/components/ui/textarea"
import { saveAnnouncementAction, setAnnouncementPublishedAction, type ActionState } from "@/lib/services/admin-actions"
import { formatDate } from "@/lib/format"
import type { AnnouncementRow } from "@/types/admin"

const initial: ActionState = { status: "idle" }
type Target = { key: string; label: string }

/** yyyy-mm-dd of an instant, in school time (what the date input shows). */
const dateInput = (d: Date | null) => (d ? new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Lagos" }).format(d) : "")

function AnnouncementDialog({ announcement, targets, trigger, triggerLabel }: { announcement?: AnnouncementRow; targets: Target[]; trigger: React.ReactElement; triggerLabel: React.ReactNode }) {
  const [open, setOpen] = React.useState(false)
  const [state, action, pending] = React.useActionState(async (previous: ActionState, formData: FormData) => {
    const next = await saveAnnouncementAction(previous, formData)
    if (next.status === "success") setOpen(false)
    return next
  }, initial)
  const err = state.fieldErrors ?? {}
  const idp = announcement?.id ?? "new"

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger render={trigger}>{triggerLabel}</Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-50 bg-brand-950/40 transition-opacity duration-150 data-ending-style:opacity-0 data-starting-style:opacity-0 supports-backdrop-filter:backdrop-blur-xs" />
        <Dialog.Popup className="fixed top-1/2 left-1/2 z-50 max-h-[92dvh] w-[min(36rem,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-xl bg-popover p-6 text-popover-foreground shadow-lg outline-none transition duration-150 data-ending-style:opacity-0 data-starting-style:opacity-0">
          <Dialog.Title className="type-card-title text-foreground">{announcement ? "Edit announcement" : "New announcement"}</Dialog.Title>
          <Dialog.Description className="mt-1 type-body-sm text-muted-foreground">
            {announcement ? "Changes apply immediately if the announcement is published." : "It is saved as a draft. Publish it when students should see it."}
          </Dialog.Description>
          <form action={action} className="mt-4 flex flex-col gap-4" noValidate>
            {announcement && <input type="hidden" name="id" value={announcement.id} />}
            {state.status === "error" && (
              <Alert variant="destructive" data-testid="announcement-error"><AlertCircleIcon aria-hidden="true" /><AlertTitle>{state.message}</AlertTitle></Alert>
            )}
            <div className="flex flex-col gap-2">
              <Label htmlFor={`a-title-${idp}`}>Title</Label>
              <Input id={`a-title-${idp}`} name="title" defaultValue={announcement?.title ?? ""} maxLength={120} aria-invalid={err.title ? true : undefined} />
              {err.title && <p className="type-caption font-normal text-destructive">{err.title}</p>}
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor={`a-content-${idp}`}>Announcement</Label>
              <Textarea id={`a-content-${idp}`} name="content" defaultValue={announcement?.content ?? ""} rows={5} maxLength={5000} aria-invalid={err.content ? true : undefined} />
              {err.content && <p className="type-caption font-normal text-destructive">{err.content}</p>}
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-2">
                <Label htmlFor={`a-target-${idp}`}>Audience</Label>
                <NativeSelect id={`a-target-${idp}`} name="target" defaultValue={announcement?.target ?? "school"}>
                  <option value="school">Whole school</option>
                  {targets.map((t) => <option key={t.key} value={t.key}>{t.label} only</option>)}
                </NativeSelect>
                {err.target && <p className="type-caption font-normal text-destructive">{err.target}</p>}
              </div>
              {(!announcement || announcement.state === "DRAFT" || announcement.state === "SCHEDULED") && (
                <div className="flex flex-col gap-2">
                  <Label htmlFor={`a-publish-${idp}`}>Publish on (optional)</Label>
                  <Input id={`a-publish-${idp}`} name="publishOn" type="date" defaultValue={dateInput(announcement?.publishedAt ?? null)} aria-invalid={err.publishOn ? true : undefined} />
                  <p className="type-caption font-normal text-muted-foreground">Leave empty to go live the moment you press Publish.</p>
                  {err.publishOn && <p className="type-caption font-normal text-destructive">{err.publishOn}</p>}
                </div>
              )}
              <div className="flex flex-col gap-2">
                <Label htmlFor={`a-expires-${idp}`}>Expiry date (optional)</Label>
                <Input id={`a-expires-${idp}`} name="expires" type="date" defaultValue={dateInput(announcement?.expiresAt ?? null)} aria-invalid={err.expires ? true : undefined} />
                {err.expires && <p className="type-caption font-normal text-destructive">{err.expires}</p>}
              </div>
            </div>
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Dialog.Close render={<Button type="button" variant="outline" />}>Cancel</Dialog.Close>
              <Button type="submit" loading={pending}>{announcement ? "Save changes" : "Save draft"}</Button>
            </div>
          </form>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

function PublishToggle({ announcement }: { announcement: AnnouncementRow }) {
  const [state, action, pending] = React.useActionState(setAnnouncementPublishedAction, initial)
  const publishing = !announcement.isPublished
  return (
    <>
      <form action={action}>
        <input type="hidden" name="id" value={announcement.id} />
        <input type="hidden" name="intent" value={publishing ? "publish" : "unpublish"} />
        <Button type="submit" variant={publishing ? "default" : "outline"} size="sm" loading={pending}>
          {publishing ? <EyeIcon aria-hidden="true" /> : <EyeOffIcon aria-hidden="true" />}
          {publishing ? "Publish" : "Unpublish"}
        </Button>
      </form>
      {state.status === "error" && <p role="alert" className="basis-full type-caption font-normal text-destructive">{state.message}</p>}
    </>
  )
}

function AnnouncementsManager({ announcements, targets, filtered = false }: { announcements: AnnouncementRow[]; targets: Target[]; filtered?: boolean }) {
  return (
    <div className="flex flex-col gap-4">
      <div>
        <AnnouncementDialog key="new" targets={targets} trigger={<Button type="button" data-testid="new-announcement" />} triggerLabel={<><PlusIcon aria-hidden="true" />New announcement</>} />
      </div>
      {announcements.length === 0 ? (
        <Card variant="subtle">
          <CardContent className="flex flex-col items-center gap-3 py-6 text-center">
            <MegaphoneIcon className="size-8 text-primary" aria-hidden="true" />
            <p className="type-label text-foreground">{filtered ? "Nothing found" : "No announcements yet"}</p>
            <p className="max-w-sm type-body-sm text-muted-foreground">{filtered ? "No announcement matches these filters." : "Create one to share news with the whole school or a single class."}</p>
          </CardContent>
        </Card>
      ) : (
        <ul className="grid gap-4 lg:grid-cols-2">
          {announcements.map((a) => (
            <li key={a.id} data-title={a.title}>
              <Card size="sm" className="h-full">
                <CardContent className="flex h-full flex-col gap-3">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <h2 className="type-card-title text-foreground">{a.title}</h2>
                    <AnnouncementStateBadge state={a.state} />
                  </div>
                  <p className="line-clamp-3 type-body-sm text-muted-foreground">{a.content}</p>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="secondary">{a.targetLabel}</Badge>
                    {a.publishedAt && (a.state === "DRAFT" || a.state === "SCHEDULED") && <Badge variant="info">{a.state === "SCHEDULED" ? "Goes live" : "Planned for"} {formatDate(a.publishedAt)}</Badge>}
                    {a.expiresAt && <Badge variant="neutral">Expires {formatDate(a.expiresAt)}</Badge>}
                    <span className="type-caption font-normal text-muted-foreground">By {a.createdBy}</span>
                  </div>
                  <div className="mt-auto flex flex-wrap items-center gap-2 pt-1">
                    <PublishToggle announcement={a} />
                    <AnnouncementDialog key={a.id} announcement={a} targets={targets} trigger={<Button type="button" variant="outline" size="sm" />} triggerLabel={<><PencilIcon aria-hidden="true" />Edit<span className="sr-only"> {a.title}</span></>} />
                  </div>
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>
      )}
      <p className="flex items-start gap-2 type-body-sm text-muted-foreground">
        <CheckCircle2Icon className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
        Students see an announcement only while it is published and not expired, and only if it is for the whole school or their own class.
      </p>
    </div>
  )
}

export { AnnouncementsManager }
