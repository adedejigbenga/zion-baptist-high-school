"use server"

import { z } from "zod"

import { runAdminAction } from "@/lib/services/admin-action-runner"
import { returnForCorrection } from "@/lib/services/admin-results"
import type { ManageState, Outcome } from "@/types/manage"

const returnSchema = z.object({
  admission: z.string().trim().min(1).max(40),
  termKey: z.string().trim().regex(/^[A-Za-z0-9-]{3,40}$/),
  subjectCode: z.string().trim().min(1).max(20),
  reason: z.string().trim().min(3, "Give a short reason (3 to 300 characters).").max(300, "Keep the reason under 300 characters."),
})

/** Sends one submitted subject back to its teacher for correction (audited). Admin only; see returnForCorrection. */
export async function returnForCorrectionAction(_previous: ManageState, formData: FormData): Promise<ManageState> {
  return runAdminAction(returnSchema, ["admission", "termKey", "subjectCode", "reason"], formData, async (actor, data): Promise<Outcome> => {
    const outcome = await returnForCorrection(actor, data)
    return outcome.ok ? outcome : { ok: false, message: outcome.message }
  })
}
