"use client"

import * as React from "react"
import Form from "next/form"

import { Label } from "@/components/ui/label"
import { NativeSelect } from "@/components/ui/native-select"
import type { ResultTermOption } from "@/types/results"

/**
 * Picks which of the student's own terms to view. It submits a plain GET form (`?term=2026-2027-first`), which Next.js
 * turns into a client-side navigation; without JavaScript the "View" button does the same. The value is a term
 * reference, never a student identifier, and the server only accepts terms that belong to the signed-in student.
 */
function TermSelector({ terms, selectedKey }: { terms: ResultTermOption[]; selectedKey: string }) {
  const id = React.useId()

  return (
    <Form action="/portal/student/results" className="flex w-full flex-col gap-1.5 sm:max-w-sm print:hidden">
      <Label htmlFor={id}>Term</Label>
      <div className="flex items-center gap-2">
        <div className="min-w-0 flex-1">
          <NativeSelect
            id={id}
            name="term"
            key={selectedKey}
            defaultValue={selectedKey}
            onChange={(event) => event.currentTarget.form?.requestSubmit()}
          >
            {terms.map((term) => (
              <option key={term.key} value={term.key}>
                {term.label}
                {term.isCurrent ? " (current)" : ""}
              </option>
            ))}
          </NativeSelect>
        </div>
        <noscript>
          <button type="submit" className="h-11 rounded-lg border border-input bg-card px-4 type-label">
            View
          </button>
        </noscript>
      </div>
    </Form>
  )
}

export { TermSelector }
