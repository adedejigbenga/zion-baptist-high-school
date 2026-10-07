import { z } from "zod"

import type { SaveRequest } from "@/lib/services/teacher-results"

/** What the result form is allowed to say. "draft" and "submit" only: there is no "publish" intent for teachers. */
export const saveRequestSchema = z.object({
  classKey: z.string().min(1).max(60),
  subjectCode: z.string().min(1).max(60),
  intent: z.enum(["draft", "submit"]),
})

const CELL_NAME = /^score::(.+?)::(.+)$/
export const MAX_CELLS = 5000
export const MAX_CELL_LENGTH = 20

export type ParsedSaveForm = { ok: true; request: SaveRequest } | { ok: false }

/**
 * Reads the result form. Only the three known fields and `score::<admission>::<component>` cells are used; everything
 * else is ignored. The values are still untrusted: the service re-checks every one of them.
 */
export function parseSaveForm(formData: FormData): ParsedSaveForm {
  const parsed = saveRequestSchema.safeParse({
    classKey: formData.get("classKey"),
    subjectCode: formData.get("subjectCode"),
    intent: formData.get("intent"),
  })
  if (!parsed.success) return { ok: false }

  const cells: SaveRequest["cells"] = {}
  let count = 0
  for (const [name, value] of formData.entries()) {
    const match = CELL_NAME.exec(name)
    if (!match) continue
    if (typeof value !== "string" || value.length > MAX_CELL_LENGTH || ++count > MAX_CELLS) return { ok: false }
    const [, admission, component] = match
    ;(cells[admission] ??= {})[component] = value
  }
  return { ok: true, request: { ...parsed.data, cells } }
}
