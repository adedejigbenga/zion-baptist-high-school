"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"

import { requireRole } from "@/lib/auth/current-user"
import { saveAnnouncement, setAnnouncementPublished } from "@/lib/services/admin-announcements"
import { publishResult, unpublishResult } from "@/lib/services/admin-results"
import { parseAnnouncementForm } from "@/lib/validation/announcement"

/**
 * Server Actions for the admin portal. A Server Action is a public HTTP endpoint, so each one:
 *   1. authenticates and verifies the ADMIN role from the database session (requireRole) BEFORE reading the form,
 *   2. validates every submitted field,
 *   3. takes the acting admin from the session, never from the form,
 *   4. runs the database operation on the server (the services also re-confirm the actor is an active admin),
 *   5. writes an audit log (inside the services).
 */

export type ActionState = {
  status: "idle" | "success" | "error"
  message?: string
  /** What is missing / wrong, one line each (publish). */
  issues?: string[]
  fieldErrors?: Partial<Record<"title" | "content" | "target" | "expires" | "publishOn", string>>
  at?: number
}

const resultRef = z.object({
  admission: z.string().trim().min(1).max(40),
  termKey: z.string().regex(/^[A-Za-z0-9-]{3,40}$/),
})
const unpublishRef = resultRef.extend({ reason: z.string().max(400) })
const idOnly = z.object({ id: z.string().regex(/^[a-z0-9]{20,40}$/i) })

const field = (formData: FormData, name: string) => {
  const v = formData.get(name)
  return typeof v === "string" ? v : ""
}
const bad = (message = "That request was not understood. Please reload the page and try again."): ActionState => ({ status: "error", message, at: Date.now() })
const refresh = () => revalidatePath("/portal/admin", "layout")

export async function publishResultAction(_previous: ActionState, formData: FormData): Promise<ActionState> {
  const admin = await requireRole("ADMIN")
  const ref = resultRef.safeParse({ admission: field(formData, "admission"), termKey: field(formData, "termKey") })
  if (!ref.success) return bad()

  const outcome = await publishResult({ userId: admin.id }, ref.data)
  if (!outcome.ok) return { status: "error", message: outcome.message, issues: outcome.issues, at: Date.now() }
  refresh()
  return { status: "success", message: outcome.message, at: Date.now() }
}

export async function unpublishResultAction(_previous: ActionState, formData: FormData): Promise<ActionState> {
  const admin = await requireRole("ADMIN")
  const ref = unpublishRef.safeParse({ admission: field(formData, "admission"), termKey: field(formData, "termKey"), reason: field(formData, "reason") })
  if (!ref.success) return bad("Give a short reason (3 to 300 characters).")

  const outcome = await unpublishResult({ userId: admin.id }, ref.data)
  if (!outcome.ok) return { status: "error", message: outcome.message, at: Date.now() }
  refresh()
  return { status: "success", message: outcome.message, at: Date.now() }
}

export async function saveAnnouncementAction(_previous: ActionState, formData: FormData): Promise<ActionState> {
  const admin = await requireRole("ADMIN")
  const parsed = parseAnnouncementForm(formData)
  if (!parsed.ok) return { status: "error", message: "Please correct the form.", fieldErrors: parsed.fieldErrors, at: Date.now() }

  const outcome = await saveAnnouncement({ userId: admin.id }, parsed.input, new Date())
  if (!outcome.ok) return { status: "error", message: outcome.message, fieldErrors: outcome.fieldErrors, at: Date.now() }
  refresh()
  return { status: "success", message: outcome.message, at: Date.now() }
}

export async function setAnnouncementPublishedAction(_previous: ActionState, formData: FormData): Promise<ActionState> {
  const admin = await requireRole("ADMIN")
  const ref = idOnly.safeParse({ id: field(formData, "id") })
  const intent = field(formData, "intent")
  if (!ref.success || (intent !== "publish" && intent !== "unpublish")) return bad()

  const outcome = await setAnnouncementPublished({ userId: admin.id }, ref.data.id, intent === "publish", new Date())
  if (!outcome.ok) return { status: "error", message: outcome.message, at: Date.now() }
  refresh()
  return { status: "success", message: outcome.message, at: Date.now() }
}
