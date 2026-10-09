"use server"

import { runAdminAction } from "@/lib/services/admin-action-runner"
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
  studentSchema,
  studentUpdateSchema,
  teacherSchema,
  teacherUpdateSchema,
} from "@/lib/validation/people"
import type { ManageState } from "@/types/manage"

/**
 * Server Actions for people management. Like every admin action: the ADMIN role is verified from the database session BEFORE
 * the form is read, every field is validated, and the acting admin comes from the session, never from the form.
 */

export async function createStudentAction(_previous: ManageState, formData: FormData): Promise<ManageState> {
  return runAdminAction(studentSchema, ["admissionNumber", "firstName", "lastName", "classKey", "email", "phone"], formData, createStudent)
}

export async function createTeacherAction(_previous: ManageState, formData: FormData): Promise<ManageState> {
  return runAdminAction(teacherSchema, ["loginId", "employeeNumber", "firstName", "lastName", "department", "qualification", "email", "phone"], formData, createTeacher)
}

export async function updateTeacherAction(_previous: ManageState, formData: FormData): Promise<ManageState> {
  return runAdminAction(teacherUpdateSchema, ["loginId", "firstName", "lastName", "department", "qualification", "email", "phone"], formData, updateTeacher)
}

export async function updateStudentAction(_previous: ManageState, formData: FormData): Promise<ManageState> {
  return runAdminAction(
    studentUpdateSchema,
    ["admissionNumber", "firstName", "lastName", "email", "phone", "gender", "dateOfBirth", "guardianName", "guardianPhone", "address"],
    formData,
    updateStudent,
  )
}

export async function setAccountActiveAction(_previous: ManageState, formData: FormData): Promise<ManageState> {
  return runAdminAction(activeSchema, ["kind", "key", "active"], formData, (actor, d) => setAccountActive(actor, d.kind, d.key, d.active === "true"))
}

export async function resetPasswordAction(_previous: ManageState, formData: FormData): Promise<ManageState> {
  return runAdminAction(accountRefSchema, ["kind", "key"], formData, (actor, d) => resetPassword(actor, d.kind, d.key))
}

export async function enrollStudentAction(_previous: ManageState, formData: FormData): Promise<ManageState> {
  return runAdminAction(enrollSchema, ["admissionNumber", "classKey", "sessionKey"], formData, enrollStudent)
}

export async function assignTeacherAction(_previous: ManageState, formData: FormData): Promise<ManageState> {
  return runAdminAction(assignmentSchema, ["teacherLoginId", "classKey", "subjectCode"], formData, assignTeacher)
}

export async function removeAssignmentAction(_previous: ManageState, formData: FormData): Promise<ManageState> {
  return runAdminAction(
    assignmentSchema.extend({ sessionKey: assignmentSchema.shape.classKey }),
    ["teacherLoginId", "classKey", "subjectCode", "sessionKey"],
    formData,
    removeAssignment,
  )
}
