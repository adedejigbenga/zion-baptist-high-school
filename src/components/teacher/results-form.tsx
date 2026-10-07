"use client"

import * as React from "react"
import { AlertCircleIcon, CheckCircle2Icon, ClockIcon, LockIcon, SaveIcon } from "lucide-react"

import { ConfirmSubmitDialog } from "@/components/teacher/confirm-submit-dialog"
import { RowStatusBadge } from "@/components/teacher/status-badges"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { formatScore } from "@/lib/format"
import { calculateEntry, parseScoreInput } from "@/lib/services/grading"
import { saveResultsAction, type SaveResultsState } from "@/lib/services/teacher-actions"
import type { TeacherWorkspace, WorkspaceRow } from "@/types/teacher"

type Ready = Extract<TeacherWorkspace, { kind: "READY" }>

const FORM_ID = "results-form"
const initialState: SaveResultsState = { status: "idle" }

/**
 * The score entry form. Totals, grades and remarks shown while typing are a PREVIEW calculated with the same grading
 * functions the server uses; the server recalculates everything from the raw scores and ignores what the browser shows.
 * The form submits only class key, subject code, intent and the score cells.
 */
function ResultsForm({ workspace }: { workspace: Ready }) {
  const [state, formAction, pending] = React.useActionState(saveResultsAction, initialState)
  const { rows, selected } = workspace
  const searching = workspace.query.trim() !== ""
  const awaitingPublication = workspace.editableCount === 0 && workspace.totalStudents > 0

  const messageRef = React.useRef<HTMLDivElement>(null)
  React.useEffect(() => {
    if (state.status !== "idle") messageRef.current?.focus()
  }, [state.at, state.status])

  if (workspace.totalStudents === 0) {
    return (
      <Alert variant="info" role="status">
        <AlertCircleIcon aria-hidden="true" />
        <AlertTitle>No students in this class</AlertTitle>
        <AlertDescription>No students are enrolled in {selected.className} for the current session.</AlertDescription>
      </Alert>
    )
  }

  return (
    <form id={FORM_ID} action={formAction} className="flex flex-col gap-4" noValidate>
      <input type="hidden" name="classKey" value={selected.classKey} />
      <input type="hidden" name="subjectCode" value={selected.subjectCode} />

      <div ref={messageRef} tabIndex={-1} className="outline-none" aria-live="polite">
        {state.status === "success" && (
          <Alert variant="success" role="status" data-testid="save-success">
            <CheckCircle2Icon aria-hidden="true" />
            <AlertTitle>Saved</AlertTitle>
            <AlertDescription>{state.message}</AlertDescription>
          </Alert>
        )}
        {state.status === "error" && (
          <Alert variant="destructive" data-testid="save-error">
            <AlertCircleIcon aria-hidden="true" />
            <AlertTitle>Not saved</AlertTitle>
            <AlertDescription>
              <p>{state.message}</p>
              {state.rowErrors && Object.keys(state.rowErrors).length > 0 && (
                <ul className="mt-2 list-disc pl-5">
                  {Object.entries(state.rowErrors).map(([admission, message]) => (
                    <li key={admission}>
                      {admission}: {message}
                    </li>
                  ))}
                </ul>
              )}
            </AlertDescription>
          </Alert>
        )}
      </div>

      {awaitingPublication && (
        <Alert variant="info" role="status" data-testid="awaiting-publication">
          <ClockIcon aria-hidden="true" />
          <AlertTitle>Submitted, awaiting administrative publication</AlertTitle>
          <AlertDescription>
            These results can no longer be edited. Students cannot see them until an administrator publishes them.
          </AlertDescription>
        </Alert>
      )}

      {rows.length === 0 ? (
        <Alert variant="info" role="status">
          <AlertCircleIcon aria-hidden="true" />
          <AlertTitle>No matching students</AlertTitle>
          <AlertDescription>No student in {selected.className} matches “{workspace.query}”.</AlertDescription>
        </Alert>
      ) : (
        <ScoreGrid key={workspace.version} workspace={workspace} errors={state.status === "error" ? (state.fieldErrors ?? {}) : {}} disabled={pending} />
      )}

      {!awaitingPublication && (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
          {searching && (
            <p className="type-caption font-normal text-muted-foreground sm:mr-auto">Clear the search to submit the whole class.</p>
          )}
          <Button type="submit" name="intent" value="draft" variant="outline" loading={pending} disabled={workspace.editableCount === 0}>
            <SaveIcon aria-hidden="true" />
            Save Draft
          </Button>
          <ConfirmSubmitDialog
            formId={FORM_ID}
            disabled={searching || pending || workspace.editableCount === 0}
            pending={pending}
            studentCount={workspace.editableCount}
            subjectName={selected.subjectName}
            className={selected.className}
          />
        </div>
      )}
    </form>
  )
}

function ScoreGrid({ workspace, errors, disabled }: { workspace: Ready; errors: Record<string, string>; disabled: boolean }) {
  const { scheme, rows } = workspace
  const [values, setValues] = React.useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {}
    for (const row of rows) for (const c of scheme.components) initial[`${row.admissionNumber}::${c.shortName}`] = row.scores[c.shortName] == null ? "" : String(row.scores[c.shortName])
    return initial
  })

  const columns = `minmax(0,2.2fr) repeat(${scheme.components.length}, minmax(5.5rem,1fr)) minmax(4.5rem,0.8fr) minmax(3.5rem,0.6fr) minmax(7rem,1.2fr)`

  return (
    <div role="table" aria-label="Student scores" className="-mx-(--page-gutter) overflow-hidden border-y border-border bg-card sm:mx-0 sm:rounded-xl sm:border">
      <div role="rowgroup" className="hidden md:block">
        <div role="row" style={{ "--cols": columns } as React.CSSProperties} className="grid gap-3 md:grid-cols-(--cols) border-b border-border bg-surface-subtle px-4 py-3 type-caption text-muted-foreground">
          <div role="columnheader">Student</div>
          {scheme.components.map((c) => (
            <div role="columnheader" key={c.shortName}>
              {c.name} <span className="font-normal">(/{c.maxScore})</span>
            </div>
          ))}
          <div role="columnheader">Total</div>
          <div role="columnheader">Grade</div>
          <div role="columnheader">Remark</div>
        </div>
      </div>
      <div role="rowgroup" className="divide-y divide-border">
        {rows.map((row) => (
          <GridRow key={row.admissionNumber} row={row} workspace={workspace} values={values} errors={errors} disabled={disabled} columns={columns} onChange={(key, v) => setValues((prev) => ({ ...prev, [key]: v }))} />
        ))}
      </div>
    </div>
  )
}

function GridRow({
  row,
  workspace,
  values,
  errors,
  disabled,
  columns,
  onChange,
}: {
  row: WorkspaceRow
  workspace: Ready
  values: Record<string, string>
  errors: Record<string, string>
  disabled: boolean
  columns: string
  onChange: (key: string, value: string) => void
}) {
  const { scheme } = workspace
  const preview = React.useMemo(() => {
    if (row.locked) return { total: row.total, grade: row.grade, remark: row.remark }
    const scores: Record<string, number | null> = {}
    for (const c of scheme.components) {
      const parsed = parseScoreInput(values[`${row.admissionNumber}::${c.shortName}`] ?? "", c.maxScore)
      scores[c.shortName] = parsed.ok ? parsed.value : null
    }
    const outcome = calculateEntry(scheme, scores)
    return { total: outcome.total, grade: outcome.grade, remark: outcome.remark }
  }, [row, scheme, values])

  return (
    <div role="row" data-admission={row.admissionNumber} style={{ "--cols": columns } as React.CSSProperties} className="grid grid-cols-2 gap-x-3 gap-y-3 px-4 py-4 md:grid-cols-(--cols) md:items-start">
      <div role="cell" className="col-span-2 flex min-w-0 flex-col gap-1 md:col-span-1">
        <p className="type-label break-words text-foreground">
          {row.firstName} {row.lastName}
        </p>
        <p className="type-caption font-normal text-muted-foreground">{row.admissionNumber}</p>
        <div>
          <RowStatusBadge status={row.status} />
        </div>
      </div>

      {scheme.components.map((c) => {
        const key = `${row.admissionNumber}::${c.shortName}`
        const error = errors[key]
        const id = `score-${row.admissionNumber.replace(/\W+/g, "-")}-${c.shortName}`
        return (
          <div role="cell" key={c.shortName} className="flex flex-col justify-end gap-1">
            <label htmlFor={id} className="type-caption text-muted-foreground md:sr-only">
              {c.name} (/{c.maxScore})
            </label>
            {row.locked ? (
              <p id={id} className="flex min-h-11 items-center gap-1.5 type-label text-foreground md:min-h-10">
                <LockIcon className="size-3.5 text-muted-foreground" aria-hidden="true" />
                {row.scores[c.shortName] == null ? "–" : formatScore(row.scores[c.shortName] as number)}
              </p>
            ) : (
              <>
                <Input
                  id={id}
                  name={`score::${key}`}
                  inputMode="decimal"
                  autoComplete="off"
                  value={values[key] ?? ""}
                  onChange={(e) => onChange(key, e.target.value)}
                  disabled={disabled}
                  aria-invalid={error ? true : undefined}
                  aria-describedby={error ? `${id}-error` : undefined}
                  aria-label={`${row.firstName} ${row.lastName}, ${c.name}, out of ${c.maxScore}`}
                  className="w-full"
                />
                {error && (
                  <p id={`${id}-error`} className="type-caption font-normal text-destructive">
                    {error}
                  </p>
                )}
              </>
            )}
          </div>
        )
      })}

      <div role="cell" className="col-span-2 flex items-center gap-2 md:col-span-1 md:min-h-10">
        <span className="type-caption text-muted-foreground md:sr-only">Total</span>
        <span className="type-label text-foreground" data-testid="row-total">{preview.total == null ? "–" : formatScore(preview.total)}</span>
      </div>
      <div role="cell" className="col-span-2 flex items-center gap-2 md:col-span-1 md:min-h-10">
        <span className="type-caption text-muted-foreground md:sr-only">Grade</span>
        <span className="type-label text-foreground" data-testid="row-grade">{preview.grade ?? "–"}</span>
      </div>
      <div role="cell" className="col-span-2 flex items-center gap-2 md:col-span-1 md:min-h-10">
        <span className="type-caption text-muted-foreground md:sr-only">Remark</span>
        <span className="type-body-sm text-foreground" data-testid="row-remark">{preview.remark ?? "–"}</span>
      </div>
    </div>
  )
}

export { ResultsForm }
