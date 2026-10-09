"use server"

import { revalidatePath } from "next/cache"
import type { z } from "zod"

import { requireRole } from "@/lib/auth/current-user"
import {
  assignTeacher,
  createStudent,
  createTeacher,
  enrollStudent,
  removeAssignment,
  resetPassword,
  setAccountActive,
  updateStudent,
  updateTeacher,
} from "@/lib/services/admin-people"
import {
  accountRefSchema,
  activeSchema,
  assignmentSchema,
  enrollSchema,
  parseForm,
  studentSchema,
  studentUpdateSchema,
  teacherSchema,
  teacherUpdateSchema,
} from "@/lib/validation/people"
import type { ManageState, Outcome } from "@/types/manage"

/**
 * Server Actions for people management. Like every admin action: the ADMIN role is verified from the database session BEFORE
 * the form is read, every field is validated, and the acting admin comes from the session, never from the form.
 */

async function run<S extends z.ZodType>(
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

export async function createStudentAction(_previous: ManageState, formData: FormData): Promise<ManageState> {
  return run(studentSchema, ["admissionNumber", "firstName", "lastName", "classKey", "email", "phone"], formData, createStudent)
}

export async function createTeacherAction(_previous: ManageState, formData: FormData): Promise<ManageState> {
  return run(teacherSchema, ["loginId", "employeeNumber", "firstName", "lastName", "department", "qualification", "email", "phone"], formData, createTeacher)
}

export async function updateTeacherAction(_previous: ManageState, formData: FormData): Promise<ManageState> {
  return run(teacherUpdateSchema, ["loginId", "firstName", "lastName", "department", "qualification", "email", "phone"], formData, updateTeacher)
}

export async function updateStudentAction(_previous: ManageState, formData: FormData): Promise<ManageState> {
  return run(
    studentUpdateSchema,
    ["admissionNumber", "firstName", "lastName", "email", "phone", "gender", "dateOfBirth", "guardianName", "guardianPhone", "address"],
    formData,
    updateStudent,
  )
}

export async function setAccountActiveAction(_previous: ManageState, formData: FormData): Promise<ManageState> {
  return run(activeSchema, ["kind", "key", "active"], formData, (actor, d) => setAccountActive(actor, d.kind, d.key, d.active === "true"))
}

export async function resetPasswordAction(_previous: ManageState, formData: FormData): Promise<ManageState> {
  return run(accountRefSchema, ["kind", "key"], formData, (actor, d) => resetPassword(actor, d.kind, d.key))
}

export async function enrollStudentAction(_previous: ManageState, formData: FormData): Promise<ManageState> {
  return run(enrollSchema, ["admissionNumber", "classKey", "sessionKey"], formData, enrollStudent)
}

export async function assignTeacherAction(_previous: ManageState, formData: FormData): Promise<ManageState> {
  return run(assignmentSchema, ["teacherLoginId", "classKey", "subjectCode"], formData, assignTeacher)
}

export async function removeAssignmentAction(_previous: ManageState, formData: FormData): Promise<ManageState> {
  return run(
    assignmentSchema.extend({ sessionKey: assignmentSchema.shape.classKey }),
    ["teacherLoginId", "classKey", "subjectCode", "sessionKey"],
    formData,
    removeAssignment,
  )
}
