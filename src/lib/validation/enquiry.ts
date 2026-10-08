import { z } from "zod"

export const ENQUIRY_TOPICS = [
  { value: "general", label: "General enquiry" },
  { value: "admissions", label: "Admissions" },
  { value: "academics", label: "Academics" },
  { value: "other", label: "Something else" },
] as const

const topicValues = ENQUIRY_TOPICS.map((t) => t.value) as [string, ...string[]]

/** What the contact form may say. Re-validated on the server; the browser's own checks are only a convenience. */
export const enquirySchema = z.object({
  name: z.string().trim().min(2, "Please enter your name.").max(80, "Please keep your name under 80 characters."),
  email: z.string().trim().max(120, "That email address is too long.").pipe(z.email("Please enter a valid email address.")),
  phone: z
    .string()
    .trim()
    .max(25, "That phone number is too long.")
    .refine((v) => v === "" || /^\+?[0-9][0-9\s()-]{5,}$/.test(v), "Please enter a valid phone number, or leave it blank."),
  topic: z.enum(topicValues, "Please choose a topic."),
  message: z.string().trim().min(10, "Please write at least 10 characters.").max(2000, "Please keep your message under 2,000 characters."),
})

export type EnquiryInput = z.infer<typeof enquirySchema>
export type EnquiryField = keyof EnquiryInput

export type ParsedEnquiry = { ok: true; input: EnquiryInput } | { ok: false; fieldErrors: Partial<Record<EnquiryField, string>> }

const field = (formData: FormData, name: string) => {
  const v = formData.get(name)
  return typeof v === "string" ? v : ""
}

export function parseEnquiryForm(formData: FormData): ParsedEnquiry {
  const parsed = enquirySchema.safeParse({
    name: field(formData, "name"),
    email: field(formData, "email"),
    phone: field(formData, "phone"),
    topic: field(formData, "topic"),
    message: field(formData, "message"),
  })
  if (parsed.success) return { ok: true, input: parsed.data }
  const fieldErrors: Partial<Record<EnquiryField, string>> = {}
  for (const issue of parsed.error.issues) {
    const key = issue.path[0] as EnquiryField
    fieldErrors[key] ??= issue.message
  }
  return { ok: false, fieldErrors }
}
