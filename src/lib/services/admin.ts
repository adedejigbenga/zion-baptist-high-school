import "server-only"

import { cache } from "react"

import { requireRole } from "@/lib/auth/current-user"
import { loadAnnouncements, loadTargetOptions } from "@/lib/services/admin-announcements"
import {
  loadAcademics,
  loadAdminOverview,
  loadAuditFilterOptions,
  loadAuditLogs,
  loadClasses,
  loadStudents,
  loadSubjects,
  loadTeachers,
  type AuditFilter,
} from "@/lib/services/admin-directory"
import { loadSessions } from "@/lib/services/admin-academics"
import { loadClassDetail, loadClassList, loadSubjectDetail, loadSubjectList } from "@/lib/services/admin-classes"
import { loadGrading } from "@/lib/services/admin-grading"
import { loadPersonOptions, loadStudentDetail, loadTeacherDetail } from "@/lib/services/admin-people"
import { loadFilterOptions, loadResultList, loadResultReview } from "@/lib/services/admin-results"
import type { ResultFilters } from "@/types/admin"

/**
 * Admin-facing data. EVERY function here starts with requireRole("ADMIN"), which validates the session in the database:
 * a signed-out visitor goes to the admin sign-in page, and a student or teacher is sent back to their own portal and gets
 * no data. The internal loaders it calls check nothing themselves, so they must only be reached through this file (or
 * through admin-actions.ts for writes). None of these functions takes a user ID.
 */

export const getAdminProfileSummary = cache(async () => {
  const user = await requireRole("ADMIN")
  return { firstName: user.firstName, lastName: user.lastName, loginId: user.loginId }
})

export async function getAdminOverview() {
  await requireRole("ADMIN")
  return loadAdminOverview()
}
export async function getStudents(query: string, page: number, filters?: { status?: string; classKey?: string }) {
  await requireRole("ADMIN")
  return loadStudents(query, page, filters)
}
export async function getTeachers(query: string, page: number, filters?: { status?: string }) {
  await requireRole("ADMIN")
  return loadTeachers(query, page, filters)
}
export async function getClasses() {
  await requireRole("ADMIN")
  return loadClasses()
}
export async function getSubjects() {
  await requireRole("ADMIN")
  return loadSubjects()
}
export async function getAcademics() {
  await requireRole("ADMIN")
  return loadAcademics()
}
export async function getAuditLogs(filter: AuditFilter) {
  await requireRole("ADMIN")
  return loadAuditLogs(filter)
}
export async function getAuditFilterOptions() {
  await requireRole("ADMIN")
  return loadAuditFilterOptions()
}
export async function getResultFilterOptions() {
  await requireRole("ADMIN")
  return loadFilterOptions()
}
export async function getResultList(filters: ResultFilters) {
  await requireRole("ADMIN")
  return loadResultList(filters)
}
export async function getResultReview(admission: string, termKey: string) {
  await requireRole("ADMIN")
  return loadResultReview(admission, termKey)
}
export async function getAnnouncements(filters: { q?: string; state?: string; target?: string } = {}) {
  await requireRole("ADMIN")
  return { announcements: await loadAnnouncements(new Date(), filters), targets: await loadTargetOptions() }
}

/** Class, subject and teacher choices for the add-student / add-teacher / assign forms. */
export async function getPersonOptions() {
  await requireRole("ADMIN")
  return loadPersonOptions()
}

export async function getTeacherDetail(loginId: string) {
  await requireRole("ADMIN")
  return loadTeacherDetail(loginId)
}

export async function getStudentDetail(admissionNumber: string) {
  await requireRole("ADMIN")
  return loadStudentDetail(admissionNumber)
}

export async function getSessions() {
  await requireRole("ADMIN")
  return loadSessions()
}
export async function getClassList() {
  await requireRole("ADMIN")
  return loadClassList()
}
export async function getClassDetail(key: string) {
  await requireRole("ADMIN")
  return loadClassDetail(key)
}
export async function getSubjectList() {
  await requireRole("ADMIN")
  return loadSubjectList()
}
export async function getSubjectDetail(code: string) {
  await requireRole("ADMIN")
  return loadSubjectDetail(code)
}
export async function getGrading() {
  await requireRole("ADMIN")
  return loadGrading()
}
