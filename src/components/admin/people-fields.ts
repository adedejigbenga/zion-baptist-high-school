import type { FieldSpec } from "@/components/admin/form-dialog"
import type { PersonOptions, StudentDetail, TeacherDetail } from "@/lib/services/admin-people"

/** Form field definitions for the people dialogs (plain data, shared by the teacher and student pages). */

const classOptions = (o: PersonOptions) => o.classes.map((c) => ({ value: c.key, label: c.label }))
const sessionOptions = (o: PersonOptions) => o.sessions.map((s) => ({ value: s.key, label: s.current ? `${s.name} (current)` : s.name }))

export const newTeacherFields: FieldSpec[] = [
  { name: "firstName", label: "First name", half: true, maxLength: 60 },
  { name: "lastName", label: "Last name", half: true, maxLength: 60 },
  { name: "loginId", label: "Login ID", half: true, maxLength: 40, hint: "Leave blank to generate one (for example ada.obi)." },
  { name: "employeeNumber", label: "Employee number", half: true, maxLength: 40, hint: "Leave blank to generate the next TCH number." },
  { name: "email", label: "Email (optional)", kind: "email", half: true, maxLength: 120 },
  { name: "phone", label: "Phone (optional)", kind: "tel", half: true, maxLength: 25 },
  { name: "department", label: "Department (optional)", half: true, maxLength: 80 },
  { name: "qualification", label: "Qualification (optional)", half: true, maxLength: 120 },
]

export function editTeacherFields(t: TeacherDetail): FieldSpec[] {
  return [
    { name: "firstName", label: "First name", half: true, maxLength: 60, defaultValue: t.firstName },
    { name: "lastName", label: "Last name", half: true, maxLength: 60, defaultValue: t.lastName },
    { name: "email", label: "Email", kind: "email", half: true, maxLength: 120, defaultValue: t.email ?? "" },
    { name: "phone", label: "Phone", kind: "tel", half: true, maxLength: 25, defaultValue: t.phone ?? "" },
    { name: "department", label: "Department", half: true, maxLength: 80, defaultValue: t.department ?? "" },
    { name: "qualification", label: "Qualification", half: true, maxLength: 120, defaultValue: t.qualification ?? "" },
  ]
}

export function newStudentFields(o: PersonOptions): FieldSpec[] {
  return [
    { name: "firstName", label: "First name", half: true, maxLength: 60 },
    { name: "lastName", label: "Last name", half: true, maxLength: 60 },
    { name: "admissionNumber", label: "Admission number", maxLength: 40, hint: "Leave blank to generate the next one (for example ZBHS/2026/007)." },
    { name: "classKey", label: "Class (current session)", kind: "select", placeholder: "Choose a class", options: classOptions(o) },
    { name: "email", label: "Email (optional)", kind: "email", half: true, maxLength: 120 },
    { name: "phone", label: "Phone (optional)", kind: "tel", half: true, maxLength: 25 },
  ]
}

export function editStudentFields(s: StudentDetail): FieldSpec[] {
  return [
    { name: "firstName", label: "First name", half: true, maxLength: 60, defaultValue: s.firstName },
    { name: "lastName", label: "Last name", half: true, maxLength: 60, defaultValue: s.lastName },
    { name: "email", label: "Email", kind: "email", half: true, maxLength: 120, defaultValue: s.email ?? "" },
    { name: "phone", label: "Phone", kind: "tel", half: true, maxLength: 25, defaultValue: s.phone ?? "" },
    {
      name: "gender", label: "Gender", kind: "select", half: true, defaultValue: s.gender ?? "",
      options: [{ value: "", label: "Not set" }, { value: "MALE", label: "Male" }, { value: "FEMALE", label: "Female" }],
    },
    { name: "dateOfBirth", label: "Date of birth", kind: "date", half: true, defaultValue: s.dateOfBirth ? s.dateOfBirth.toISOString().slice(0, 10) : "" },
    { name: "guardianName", label: "Guardian name", half: true, maxLength: 100, defaultValue: s.guardianName ?? "" },
    { name: "guardianPhone", label: "Guardian phone", kind: "tel", half: true, maxLength: 25, defaultValue: s.guardianPhone ?? "" },
    { name: "address", label: "Address", kind: "textarea", maxLength: 200, defaultValue: s.address ?? "" },
  ]
}

export function enrollFields(o: PersonOptions): FieldSpec[] {
  const current = o.sessions.find((s) => s.current)
  return [
    { name: "classKey", label: "Class", kind: "select", placeholder: "Choose a class", options: classOptions(o) },
    { name: "sessionKey", label: "Academic session", kind: "select", defaultValue: current?.key ?? "", options: sessionOptions(o) },
  ]
}

/** Class + subject (+ teacher when not fixed by the page). */
export function assignFields(o: PersonOptions, opts: { teacher?: boolean; session?: boolean } = {}): FieldSpec[] {
  const fields: FieldSpec[] = []
  if (opts.teacher) {
    fields.push({ name: "teacherLoginId", label: "Teacher", kind: "select", placeholder: "Choose a teacher", options: o.teachers.map((t) => ({ value: t.loginId, label: `${t.name} (${t.loginId})` })) })
  }
  fields.push(
    { name: "classKey", label: "Class", kind: "select", half: true, placeholder: "Choose a class", options: classOptions(o) },
    { name: "subjectCode", label: "Subject", kind: "select", half: true, placeholder: "Choose a subject", options: o.subjects.map((s) => ({ value: s.code, label: `${s.name} (${s.code})` })) },
  )
  return fields
}
