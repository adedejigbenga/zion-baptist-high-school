"use client"

import * as React from "react"
import Form from "next/form"

import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { NativeSelect } from "@/components/ui/native-select"
import type { WorkspaceOption } from "@/types/teacher"

/**
 * Class and subject selectors. They only offer this teacher's own assignments, and they submit keys ("jss-1", "MTH")
 * as a plain GET form. Whatever arrives is checked against the teacher's assignments again on the server.
 */
function ResultsPicker({ options, classKey, subjectCode, terms, termKey, sessionName }: { options: WorkspaceOption[]; classKey: string; subjectCode: string; terms: { key: string; name: string; current: boolean }[]; termKey: string; sessionName: string }) {
  const formRef = React.useRef<HTMLFormElement>(null)
  const [selectedClass, setSelectedClass] = React.useState(classKey)
  const [selectedSubject, setSelectedSubject] = React.useState(subjectCode)
  const subjects = options.find((o) => o.classKey === selectedClass)?.subjects ?? []

  return (
    <Form ref={formRef} action="/portal/teacher/results" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_1fr_auto] lg:items-end">
      <div className="flex flex-col gap-2">
        <Label htmlFor="class-select">Class</Label>
        <NativeSelect
          id="class-select"
          name="class"
          value={selectedClass}
          onChange={(e) => {
            const next = e.target.value
            setSelectedClass(next)
            setSelectedSubject(options.find((o) => o.classKey === next)?.subjects[0]?.code ?? "")
          }}
        >
          {options.map((o) => (
            <option key={o.classKey} value={o.classKey}>
              {o.className}
            </option>
          ))}
        </NativeSelect>
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="subject-select">Subject</Label>
        <NativeSelect id="subject-select" name="subject" value={selectedSubject} onChange={(e) => setSelectedSubject(e.target.value)}>
          {subjects.map((s) => (
            <option key={s.code} value={s.code}>
              {s.name}
            </option>
          ))}
        </NativeSelect>
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="term-select">Term ({sessionName})</Label>
        <NativeSelect id="term-select" name="term" defaultValue={termKey}>
          {terms.map((t) => (
            <option key={t.key} value={t.key}>
              {t.name === "FIRST" ? "First Term" : t.name === "SECOND" ? "Second Term" : "Third Term"}
              {t.current ? " (current)" : ""}
            </option>
          ))}
        </NativeSelect>
      </div>
      <Button type="submit" variant="outline">
        Show students
      </Button>
    </Form>
  )
}

export { ResultsPicker }
