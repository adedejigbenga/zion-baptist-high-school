import { z } from "zod"

import type { FieldErrors } from "@/types/manage"

/**
 * What the people forms (teachers, students, assignments, enrolment) may say. Everything is re-validated on the server.
 * Classes, subjects and sessions arrive as keys ("jss-1", "MTH", "2026-2027") and are matched against the real records by
 * the service; the browser never supplies a user ID or a role.
 */

export type { FieldErrors }

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

/** Empty means "generate one for me". */
const optionalId = (label: string) => z.union([z.literal(""), idText(label)])

const optionalEmail = z.union([z.literal(""), z.string().trim().max(120, "Keep the email under 120 characters.").email("Enter a valid email address.")])
const optionalPhone = z.union([
  z.literal(""),
  z
    .string()
    .trim()
    .max(25, "Keep the phone number under 25 characters.")
    .regex(/^[0-9+()\s-]{6,25}$/, "Enter a valid phone number."),
])
const optionalText = (label: string, max: number) => z.string().trim().max(max, `Keep the ${label} under ${max} characters.`)

export const studentSchema = z.object({
  admissionNumber: optionalId("admission number"),
  firstName: name("first name"),
  lastName: name("last name"),
  classKey: z.string().trim().min(1, "Choose a class.").max(60),
  email: optionalEmail,
  phone: optionalPhone,
})

export const teacherSchema = z.object({
  loginId: optionalId("login ID"),
  employeeNumber: optionalId("employee number"),
  firstName: name("first name"),
  lastName: name("last name"),
  department: optionalText("department", 80),
  qualification: optionalText("qualification", 120),
  email: optionalEmail,
  phone: optionalPhone,
})

export const teacherUpdateSchema = z.object({
  loginId: z.string().trim().min(1).max(40),
  firstName: name("first name"),
  lastName: name("last name"),
  department: optionalText("department", 80),
  qualification: optionalText("qualification", 120),
  email: optionalEmail,
  phone: optionalPhone,
})

const optionalDate = z
  .string()
  .trim()
  .refine((v) => v === "" || (/^\d{4}-\d{2}-\d{2}$/.test(v) && new Date(`${v}T00:00:00Z`).toISOString().startsWith(v)), "Choose a valid date.")

export const studentUpdateSchema = z.object({
  admissionNumber: z.string().trim().min(1).max(40),
  firstName: name("first name"),
  lastName: name("last name"),
  email: optionalEmail,
  phone: optionalPhone,
  gender: z.enum(["", "MALE", "FEMALE"], { error: "Choose a valid gender." }),
  dateOfBirth: optionalDate,
  guardianName: optionalText("guardian name", 100),
  guardianPhone: optionalPhone,
  address: optionalText("address", 200),
})

export const assignmentSchema = z.object({
  teacherLoginId: z.string().trim().min(1, "Choose a teacher.").max(40),
  classKey: z.string().trim().min(1, "Choose a class.").max(60),
  subjectCode: z.string().trim().min(1, "Choose a subject.").max(20),
})

export const accountRefSchema = z.object({
  kind: z.enum(["teacher", "student"]),
  key: z.string().trim().min(1).max(40),
})
export const activeSchema = accountRefSchema.extend({ active: z.enum(["true", "false"]) })

export const enrollSchema = z.object({
  admissionNumber: z.string().trim().min(1).max(40),
  classKey: z.string().trim().min(1, "Choose a class.").max(60),
  sessionKey: z.string().trim().max(20),
})

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
