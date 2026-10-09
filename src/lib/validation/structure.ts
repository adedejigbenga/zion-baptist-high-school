import { z } from "zod"

/**
 * What the school-structure forms (academic sessions, classes, subjects, grading) may say. Everything is re-validated on
 * the server; the browser names records by key (session "2026-2027", class "jss-1", subject "MTH", scheme by name).
 */

const date = (label: string) =>
  z
    .string()
    .trim()
    .regex(/^\d{4}-\d{2}-\d{2}$/, `Choose the ${label}.`)
    .refine((v) => new Date(`${v}T00:00:00Z`).toISOString().startsWith(v), `Choose a valid ${label}.`)

const checkbox = z.union([z.literal(""), z.literal("true")]).transform((v) => v === "true")
const key = z.string().trim().min(1).max(60)
const text = (label: string, min: number, max: number) =>
  z.string().trim().min(min, `Enter the ${label}.`).max(max, `Keep the ${label} under ${max} characters.`)

export const TERM_NAMES = ["FIRST", "SECOND", "THIRD"] as const
const termName = z.enum(TERM_NAMES, { error: "Choose a term." })

// ---- academic sessions ---------------------------------------------------------------------------

export const sessionCreateSchema = z.object({
  name: z.string().trim().regex(/^\d{4}\/\d{4}$/, "Use the form 2026/2027."),
  startDate: date("start date"),
  endDate: date("end date"),
  firstStart: date("First Term start date"),
  firstEnd: date("First Term end date"),
  secondStart: date("Second Term start date"),
  secondEnd: date("Second Term end date"),
  thirdStart: date("Third Term start date"),
  thirdEnd: date("Third Term end date"),
  makeCurrent: checkbox,
})

export const sessionUpdateSchema = z.object({ sessionKey: key, startDate: date("start date"), endDate: date("end date") })
export const sessionRefSchema = z.object({ sessionKey: key })
export const termSaveSchema = z.object({ sessionKey: key, term: termName, startDate: date("start date"), endDate: date("end date") })
export const termRefSchema = z.object({ sessionKey: key, term: termName })

// ---- classes and subjects -------------------------------------------------------------------------

const level = z
  .string()
  .trim()
  .regex(/^\d{1,2}$/, "Enter the level as a number (1 for JSS 1 up to 6 for SS 3).")
  .transform(Number)
  .refine((n) => n >= 1 && n <= 12, "The level must be between 1 and 12.")

const section = z.string().trim().max(10, "Keep the section under 10 characters.").regex(/^[A-Za-z0-9 ]*$/, "Use letters and numbers only in the section.")

export const classSchema = z.object({
  name: text("class name", 1, 30),
  level,
  section,
})
export const classUpdateSchema = classSchema.extend({ classKey: key, isActive: checkbox })

const subjectCode = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^[A-Z0-9]{2,10}$/, "Use 2 to 10 letters or numbers for the code (for example MTH).")

export const subjectSchema = z.object({
  code: subjectCode,
  name: text("subject name", 2, 80),
  description: z.string().trim().max(300, "Keep the description under 300 characters."),
})
export const subjectUpdateSchema = z.object({
  code: key,
  name: text("subject name", 2, 80),
  description: z.string().trim().max(300, "Keep the description under 300 characters."),
  isActive: checkbox,
})

export const classSubjectSchema = z.object({ classKey: key, subjectCode: key })

// ---- grading -------------------------------------------------------------------------------------

const decimal = (label: string) =>
  z
    .string()
    .trim()
    .regex(/^\d{1,4}(\.\d{1,2})?$/, `Enter the ${label} as a number (up to 2 decimal places).`)
    .transform(Number)

export const schemeCreateSchema = z.object({
  name: text("scheme name", 3, 80),
  description: z.string().trim().max(200, "Keep the description under 200 characters."),
  copyFrom: z.string().trim().max(80),
})
export const schemeRefSchema = z.object({ scheme: z.string().trim().min(1).max(80) })

const component = {
  name: text("component name", 2, 60),
  shortName: text("short name", 1, 10),
  maxScore: decimal("maximum score").refine((n) => n > 0 && n <= 1000, "The maximum score must be more than 0 and at most 1000."),
  weight: decimal("weight").refine((n) => n > 0 && n <= 100, "The weight must be more than 0 and at most 100."),
  sortOrder: z.string().trim().regex(/^\d{1,3}$/, "Enter the order as a whole number.").transform(Number),
}
export const componentSchema = z.object({ scheme: z.string().trim().min(1).max(80), ...component })
export const componentUpdateSchema = componentSchema.extend({ current: z.string().trim().min(1).max(10) })
export const componentRefSchema = z.object({ scheme: z.string().trim().min(1).max(80), shortName: z.string().trim().min(1).max(10) })

const band = {
  grade: text("grade", 1, 5),
  minScore: decimal("lowest score").refine((n) => n >= 0 && n <= 100, "The lowest score must be between 0 and 100."),
  maxScore: decimal("highest score").refine((n) => n >= 0 && n <= 100, "The highest score must be between 0 and 100."),
  remark: text("remark", 2, 40),
  sortOrder: z.string().trim().regex(/^\d{1,3}$/, "Enter the order as a whole number.").transform(Number),
}
export const bandSchema = z.object({ scheme: z.string().trim().min(1).max(80), ...band })
export const bandUpdateSchema = bandSchema.extend({ current: z.string().trim().min(1).max(5) })
export const bandRefSchema = z.object({ scheme: z.string().trim().min(1).max(80), grade: z.string().trim().min(1).max(5) })
