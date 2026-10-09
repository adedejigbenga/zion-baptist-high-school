"use server"

import { runAdminAction } from "@/lib/services/admin-action-runner"
import { createSession, saveTerm, setCurrentSession, setCurrentTerm, updateSession } from "@/lib/services/admin-academics"
import { addSubjectToClass, createClass, createSubject, removeSubjectFromClass, updateClass, updateSubject } from "@/lib/services/admin-classes"
import {
  addBand,
  addComponent,
  createScheme,
  deleteBand,
  deleteComponent,
  setDefaultScheme,
  updateBand,
  updateComponent,
} from "@/lib/services/admin-grading"
import {
  bandRefSchema,
  bandSchema,
  bandUpdateSchema,
  classSchema,
  classSubjectSchema,
  classUpdateSchema,
  componentRefSchema,
  componentSchema,
  componentUpdateSchema,
  schemeCreateSchema,
  schemeRefSchema,
  sessionCreateSchema,
  sessionRefSchema,
  sessionUpdateSchema,
  subjectSchema,
  subjectUpdateSchema,
  termRefSchema,
  termSaveSchema,
} from "@/lib/validation/structure"
import type { ManageState } from "@/types/manage"

/**
 * Server Actions for sessions, classes, subjects and grading. Each one follows runAdminAction: the ADMIN role is verified
 * from the database session before the form is read, fields are validated, and the acting admin comes from the session.
 */

type A = (previous: ManageState, formData: FormData) => Promise<ManageState>

// ---- academic sessions ---------------------------------------------------------------------------
export const createSessionAction: A = async (_p, f) =>
  runAdminAction(sessionCreateSchema, ["name", "startDate", "endDate", "firstStart", "firstEnd", "secondStart", "secondEnd", "thirdStart", "thirdEnd", "makeCurrent"], f, (a, d) => createSession(a, d))
export const updateSessionAction: A = async (_p, f) => runAdminAction(sessionUpdateSchema, ["sessionKey", "startDate", "endDate"], f, updateSession)
export const saveTermAction: A = async (_p, f) => runAdminAction(termSaveSchema, ["sessionKey", "term", "startDate", "endDate"], f, saveTerm)
export const setCurrentSessionAction: A = async (_p, f) => runAdminAction(sessionRefSchema, ["sessionKey"], f, (a, d) => setCurrentSession(a, d.sessionKey))
export const setCurrentTermAction: A = async (_p, f) => runAdminAction(termRefSchema, ["sessionKey", "term"], f, setCurrentTerm)

// ---- classes and subjects ------------------------------------------------------------------------
export const createClassAction: A = async (_p, f) => runAdminAction(classSchema, ["name", "level", "section"], f, createClass)
export const updateClassAction: A = async (_p, f) => runAdminAction(classUpdateSchema, ["classKey", "name", "level", "section", "isActive"], f, updateClass)
export const addSubjectToClassAction: A = async (_p, f) => runAdminAction(classSubjectSchema, ["classKey", "subjectCode"], f, addSubjectToClass)
export const removeSubjectFromClassAction: A = async (_p, f) => runAdminAction(classSubjectSchema, ["classKey", "subjectCode"], f, removeSubjectFromClass)
export const createSubjectAction: A = async (_p, f) => runAdminAction(subjectSchema, ["code", "name", "description"], f, createSubject)
export const updateSubjectAction: A = async (_p, f) => runAdminAction(subjectUpdateSchema, ["code", "name", "description", "isActive"], f, updateSubject)

// ---- grading -------------------------------------------------------------------------------------
export const createSchemeAction: A = async (_p, f) => runAdminAction(schemeCreateSchema, ["name", "description", "copyFrom"], f, createScheme)
export const setDefaultSchemeAction: A = async (_p, f) => runAdminAction(schemeRefSchema, ["scheme"], f, (a, d) => setDefaultScheme(a, d.scheme))
export const addComponentAction: A = async (_p, f) => runAdminAction(componentSchema, ["scheme", "name", "shortName", "maxScore", "weight", "sortOrder"], f, addComponent)
export const updateComponentAction: A = async (_p, f) => runAdminAction(componentUpdateSchema, ["scheme", "current", "name", "shortName", "maxScore", "weight", "sortOrder"], f, updateComponent)
export const deleteComponentAction: A = async (_p, f) => runAdminAction(componentRefSchema, ["scheme", "shortName"], f, deleteComponent)
export const addBandAction: A = async (_p, f) => runAdminAction(bandSchema, ["scheme", "grade", "minScore", "maxScore", "remark", "sortOrder"], f, addBand)
export const updateBandAction: A = async (_p, f) => runAdminAction(bandUpdateSchema, ["scheme", "current", "grade", "minScore", "maxScore", "remark", "sortOrder"], f, updateBand)
export const deleteBandAction: A = async (_p, f) => runAdminAction(bandRefSchema, ["scheme", "grade"], f, deleteBand)
