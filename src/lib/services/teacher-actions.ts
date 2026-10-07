"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"

import { requireRole } from "@/lib/auth/current-user"
import { saveSubjectResults } from "@/lib/services/teacher-results"
import { parseSaveForm } from "@/lib/validation/teacher"

/**
 * Server Action behind the teacher's "Save Draft" and "Submit Result" buttons. A Server Action is a public HTTP endpoint,
 * so nothing here is trusted: the session is re-checked, the form is re-parsed, and the service re-checks the
 * assignment, the roster, the score names and every value. There is deliberately no "publish" intent.
 */

export type SaveResultsState = {
  status: "idle" | "success" | "error"
  message?: string
  /** key = `${admissionNumber}::${componentShortName}` */
  fieldErrors?: Record<string, string>
  /** key = admission number */
  rowErrors?: Record<string, string>
  /** Changes on every response so the page can show a fresh message. */
  at?: number
}

export async function saveResultsAction(_previous: SaveResultsState, formData: FormData): Promise<SaveResultsState> {
  const user = await requireRole("TEACHER")
  if (!user.teacherId) redirect("/portal")

  const form = parseSaveForm(formData)
  if (!form.ok) return { status: "error", message: "That request was not understood. Please reload the page and try again.", at: Date.now() }

  const outcome = await saveSubjectResults({ teacherId: user.teacherId, userId: user.id }, form.request)

  if (!outcome.ok) {
    return { status: "error", message: outcome.message, fieldErrors: outcome.fieldErrors, rowErrors: outcome.rowErrors, at: Date.now() }
  }

  // Refresh every teacher page (results grid, dashboard counts, My Classes) with the saved data.
  revalidatePath("/portal/teacher", "layout")
  return { status: "success", message: outcome.message, at: Date.now() }
}
