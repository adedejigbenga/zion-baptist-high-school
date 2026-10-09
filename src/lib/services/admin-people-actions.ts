"use server"

import { revalidatePath } from "next/cache"

import { requireRole } from "@/lib/auth/current-user"
import { assignTeacher, createStudent, createTeacher } from "@/lib/services/admin-people"
import { assignmentSchema, parseForm, studentSchema, teacherSchema, type FieldErrors } from "@/lib/validation/people"

/**
 * Server Actions for adding people. Like every admin action: the ADMIN role is verified from the database session BEFORE the
 * form is read, every field is validated, and the acting admin comes from the session, never from the form.
 */

export type PeopleState = {
  status: "idle" | "success" | "error"
  message?: string
  fieldErrors?: FieldErrors
  /** Shown once after an account is created. Never stored in state anywhere else. */
  credentials?: { loginId: string; password: string }
  at?: number
}

const invalid = (fieldErrors: FieldErrors): PeopleState => ({ status: "error", message: "Please correct the form.", fieldErrors, at: Date.now() })

export async function createStudentAction(_previous: PeopleState, formData: FormData): Promise<PeopleState> {
  const admin = await requireRole("ADMIN")
  const parsed = parseForm(studentSchema, formData, ["admissionNumber", "firstName", "lastName", "classKey"])
  if (!parsed.ok) return invalid(parsed.fieldErrors)

  const outcome = await createStudent({ userId: admin.id }, parsed.data)
  if (!outcome.ok) return { status: "error", message: outcome.message, fieldErrors: outcome.fieldErrors, at: Date.now() }
  revalidatePath("/portal/admin", "layout")
  return { status: "success", message: outcome.message, credentials: outcome.credentials, at: Date.now() }
}

export async function createTeacherAction(_previous: PeopleState, formData: FormData): Promise<PeopleState> {
  const admin = await requireRole("ADMIN")
  const parsed = parseForm(teacherSchema, formData, ["loginId", "employeeNumber", "firstName", "lastName", "department"])
  if (!parsed.ok) return invalid(parsed.fieldErrors)

  const outcome = await createTeacher({ userId: admin.id }, { ...parsed.data, department: parsed.data.department || null })
  if (!outcome.ok) return { status: "error", message: outcome.message, fieldErrors: outcome.fieldErrors, at: Date.now() }
  revalidatePath("/portal/admin", "layout")
  return { status: "success", message: outcome.message, credentials: outcome.credentials, at: Date.now() }
}

export async function assignTeacherAction(_previous: PeopleState, formData: FormData): Promise<PeopleState> {
  const admin = await requireRole("ADMIN")
  const parsed = parseForm(assignmentSchema, formData, ["teacherLoginId", "classKey", "subjectCode"])
  if (!parsed.ok) return invalid(parsed.fieldErrors)

  const outcome = await assignTeacher({ userId: admin.id }, parsed.data)
  if (!outcome.ok) return { status: "error", message: outcome.message, fieldErrors: outcome.fieldErrors, at: Date.now() }
  revalidatePath("/portal/admin", "layout")
  return { status: "success", message: outcome.message, at: Date.now() }
}
