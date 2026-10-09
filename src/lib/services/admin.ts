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
import { loadPersonOptions } from "@/lib/services/admin-people"
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
export async function getStudents(query: string, page: number) {
  await requireRole("ADMIN")
  return loadStudents(query, page)
}
export async function getTeachers(query: string, page: number) {
  await requireRole("ADMIN")
  return loadTeachers(query, page)
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
export async function getAnnouncements() {
  await requireRole("ADMIN")
  return { announcements: await loadAnnouncements(new Date()), targets: await loadTargetOptions() }
}

/** Class, subject and teacher choices for the add-student / add-teacher / assign forms. */
export async function getPersonOptions() {
  await requireRole("ADMIN")
  return loadPersonOptions()
}
