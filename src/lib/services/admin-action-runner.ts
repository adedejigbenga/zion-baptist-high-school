import "server-only"

import { revalidatePath } from "next/cache"
import type { z } from "zod"

import { requireRole } from "@/lib/auth/current-user"
import { parseForm } from "@/lib/validation/people"
import type { ManageState, Outcome } from "@/types/manage"

/**
 * The one shape every admin management Server Action follows:
 *   1. requireRole("ADMIN") from the database session BEFORE the form is read
 *   2. validate every field on the server (the browser's checks are only a convenience)
 *   3. take the acting admin from the session, never from the form
 *   4. run the write service (which re-confirms the actor and writes the audit record)
 *   5. refresh the admin pages and return a safe, understandable result for the form
 */
export async function runAdminAction<S extends z.ZodType>(
  schema: S,
  fields: string[],
  formData: FormData,
  write: (actor: { userId: string }, data: z.infer<S>) => Promise<Outcome>,
): Promise<ManageState> {
  const admin = await requireRole("ADMIN")
  const parsed = parseForm(schema, formData, fields)
  if (!parsed.ok) return { status: "error", message: "Please correct the form.", fieldErrors: parsed.fieldErrors, at: Date.now() }
  const outcome = await write({ userId: admin.id }, parsed.data)
  if (!outcome.ok) return { status: "error", message: outcome.message, fieldErrors: outcome.fieldErrors, at: Date.now() }
  revalidatePath("/portal/admin", "layout")
  return { status: "success", message: outcome.message, credentials: outcome.credentials, at: Date.now() }
}
