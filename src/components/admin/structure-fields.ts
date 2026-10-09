import type { FieldSpec } from "@/components/admin/form-dialog"
import type { ClassDetail, SubjectDetail } from "@/lib/services/admin-classes"
import type { SchemeView } from "@/lib/services/admin-grading"

/** Form field definitions for the classes, subjects and grading dialogs (plain data). */

export function classFields(c?: ClassDetail): FieldSpec[] {
  const fields: FieldSpec[] = [
    { name: "name", label: "Class name", half: true, maxLength: 30, defaultValue: c?.name ?? "", hint: "For example JSS 1 or SS 3." },
    { name: "level", label: "Level", kind: "number", half: true, min: "1", max: "12", step: "1", defaultValue: c ? String(c.level) : "", hint: "1 for JSS 1 up to 6 for SS 3. Used to order classes." },
    { name: "section", label: "Section (optional)", half: true, maxLength: 10, defaultValue: c?.section ?? "", hint: "For example A or B." },
  ]
  if (c) fields.push({ name: "isActive", label: "Open for enrolment", kind: "checkbox", defaultValue: c.active ? "true" : "" })
  return fields
}

export function subjectFields(s?: SubjectDetail): FieldSpec[] {
  const fields: FieldSpec[] = []
  if (!s) fields.push({ name: "code", label: "Subject code", half: true, maxLength: 10, hint: "2 to 10 letters or numbers, for example MTH. It cannot be changed later." })
  fields.push(
    { name: "name", label: "Subject name", half: !s, maxLength: 80, defaultValue: s?.name ?? "" },
    { name: "description", label: "Description (optional)", kind: "textarea", maxLength: 300, defaultValue: s?.description ?? "" },
  )
  if (s) fields.push({ name: "isActive", label: "Offered by the school", kind: "checkbox", defaultValue: s.active ? "true" : "" })
  return fields
}

export const componentFields = (c?: SchemeView["components"][number]): FieldSpec[] => [
  { name: "name", label: "Component name", half: true, maxLength: 60, defaultValue: c?.name ?? "", hint: "For example First Test, Continuous Assessment or Examination." },
  { name: "shortName", label: "Short name", half: true, maxLength: 10, defaultValue: c?.shortName ?? "", hint: "Shown as the column heading, for example CA." },
  { name: "maxScore", label: "Maximum score", kind: "number", half: true, step: "0.01", min: "0", defaultValue: c ? String(c.maxScore) : "", hint: "What the teacher marks out of." },
  { name: "weight", label: "Weight (%)", kind: "number", half: true, step: "0.01", min: "0", max: "100", defaultValue: c ? String(c.weight) : "", hint: "Share of the total. All weights must add up to 100." },
  { name: "sortOrder", label: "Column order", kind: "number", half: true, step: "1", min: "0", defaultValue: c ? String(c.sortOrder) : "0" },
]

export const bandFields = (b?: SchemeView["bands"][number]): FieldSpec[] => [
  { name: "grade", label: "Grade", half: true, maxLength: 5, defaultValue: b?.grade ?? "", hint: "For example A or B2." },
  { name: "remark", label: "Remark", half: true, maxLength: 40, defaultValue: b?.remark ?? "", hint: "For example Excellent." },
  { name: "minScore", label: "Lowest total", kind: "number", half: true, step: "0.01", min: "0", max: "100", defaultValue: b ? String(b.minScore) : "" },
  { name: "maxScore", label: "Highest total", kind: "number", half: true, step: "0.01", min: "0", max: "100", defaultValue: b ? String(b.maxScore) : "" },
  { name: "sortOrder", label: "Display order", kind: "number", half: true, step: "1", min: "0", defaultValue: b ? String(b.sortOrder) : "0" },
]
