import { z } from "zod"

/**
 * What the announcement form may say. Everything is re-validated on the server; nothing from the browser is trusted.
 * `target` is "school" or a class key ("jss-1"), matched against the real classes by the service.
 */
export const announcementSchema = z.object({
  id: z.string().regex(/^[a-z0-9]{20,40}$/i, "Unknown announcement").optional(),
  title: z.string().trim().min(3, "Enter a title (at least 3 characters).").max(120, "Keep the title under 120 characters."),
  content: z.string().trim().min(3, "Enter the announcement text.").max(5000, "Keep the text under 5,000 characters."),
  target: z.string().trim().min(1).max(60),
  /** yyyy-mm-dd or empty for "publish as soon as I press Publish". */
  publishOn: z
    .string()
    .trim()
    .refine((v) => v === "" || (/^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(`${v}T00:00:00Z`)) && new Date(`${v}T00:00:00Z`).toISOString().startsWith(v)), "Choose a valid date.")
    .optional(),
  /** yyyy-mm-dd or empty for "never expires". */
  expires: z
    .string()
    .trim()
    .refine((v) => v === "" || (/^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(`${v}T00:00:00Z`)) && new Date(`${v}T00:00:00Z`).toISOString().startsWith(v)), "Choose a valid date."),
})

export type AnnouncementInput = z.infer<typeof announcementSchema>

export type ParsedAnnouncement =
  | { ok: true; input: AnnouncementInput }
  | { ok: false; fieldErrors: Partial<Record<"title" | "content" | "target" | "expires" | "publishOn", string>> }

/** The end of the chosen day in school time (Africa/Lagos is UTC+1 all year). */
export function endOfSchoolDay(date: string): Date {
  return new Date(`${date}T23:59:59+01:00`)
}

/** The start of the chosen day in school time. */
export function startOfSchoolDay(date: string): Date {
  return new Date(`${date}T00:00:00+01:00`)
}

export function parseAnnouncementForm(formData: FormData): ParsedAnnouncement {
  const raw = (name: string) => {
    const v = formData.get(name)
    return typeof v === "string" ? v : ""
  }
  const parsed = announcementSchema.safeParse({
    id: raw("id") || undefined,
    title: raw("title"),
    content: raw("content"),
    target: raw("target"),
    publishOn: raw("publishOn"),
    expires: raw("expires"),
  })
  if (parsed.success) return { ok: true, input: parsed.data }
  const fieldErrors: Record<string, string> = {}
  for (const issue of parsed.error.issues) {
    const key = String(issue.path[0] ?? "title")
    fieldErrors[key] ??= issue.message
  }
  return { ok: false, fieldErrors }
}
