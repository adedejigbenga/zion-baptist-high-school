import { z } from "zod"

/**
 * What the "add student / add teacher / assign teacher" forms may say. Everything is re-validated on the server.
 * Class and subject arrive as keys ("jss-1", "MTH") and are matched against the real records by the service.
 */

const name = (label: string) =>
  z
    .string()
    .trim()
    .min(1, `Enter the ${label}.`)
    .max(60, `Keep the ${label} under 60 characters.`)
    .regex(/^[\p{L}][\p{L} .'’-]*$/u, `Use letters only in the ${label}.`)

const idText = (label: string) =>
  z
    .string()
    .trim()
    .min(3, `Enter the ${label} (at least 3 characters).`)
    .max(40, `Keep the ${label} under 40 characters.`)
    .regex(/^[A-Za-z0-9][A-Za-z0-9/._-]*$/, `Use letters, numbers and / . _ - only in the ${label}.`)

export const studentSchema = z.object({
  admissionNumber: idText("admission number"),
  firstName: name("first name"),
  lastName: name("last name"),
  classKey: z.string().trim().min(1, "Choose a class.").max(60),
})

export const teacherSchema = z.object({
  loginId: idText("login ID"),
  employeeNumber: idText("employee number"),
  firstName: name("first name"),
  lastName: name("last name"),
  department: z.string().trim().max(80, "Keep the department under 80 characters."),
})

export const assignmentSchema = z.object({
  teacherLoginId: z.string().trim().min(1, "Choose a teacher.").max(40),
  classKey: z.string().trim().min(1, "Choose a class.").max(60),
  subjectCode: z.string().trim().min(1, "Choose a subject.").max(20),
})

export type FieldErrors = Record<string, string>

/** Reads the named form fields as plain strings (anything else becomes ""), then validates. */
export function parseForm<T extends z.ZodType>(
  schema: T,
  formData: FormData,
  fields: string[],
): { ok: true; data: z.infer<T> } | { ok: false; fieldErrors: FieldErrors } {
  const raw: Record<string, string> = {}
  for (const f of fields) {
    const v = formData.get(f)
    raw[f] = typeof v === "string" ? v : ""
  }
  const parsed = schema.safeParse(raw)
  if (parsed.success) return { ok: true, data: parsed.data }
  const fieldErrors: FieldErrors = {}
  for (const issue of parsed.error.issues) {
    const key = String(issue.path[0] ?? "form")
    fieldErrors[key] ??= issue.message
  }
  return { ok: false, fieldErrors }
}
