import { BrandLogo } from "@/components/layout/brand-logo"
import { TERM_LABEL } from "@/lib/academic"
import { formatDate, formatScore } from "@/lib/format"
import type { ResultSheet } from "@/types/results"

const cell = "px-1.5 py-3 align-middle sm:px-3"
const stickyFirst =
  "max-sm:sticky max-sm:left-0 max-sm:z-10 max-sm:shadow-[1px_0_0_var(--color-border)] print:static print:shadow-none"

/**
 * The student's published result as a printable sheet. It only renders a ResultSheet, which exists only for a
 * PUBLISHED result. Columns, grades and the grading key all come from the result's own grading scheme in the database;
 * no component name, grade letter or band is written in this file.
 *
 * On screen it is a card; when printed it becomes a plain A4 page (the app chrome is hidden, see globals.css).
 */
function ResultSheetView({ sheet }: { sheet: ResultSheet }) {
  const { student, components, rows, summary, gradeKey } = sheet
  const fullName = `${student.firstName} ${student.lastName}`
  const term = TERM_LABEL[sheet.termName]

  const details: [string, string][] = [
    ["Student name", fullName],
    ["Admission number", student.admissionNumber],
    ["Class", sheet.className],
    ["Academic session", sheet.sessionName],
    ["Term", term],
  ]

  return (
    <article
      aria-labelledby="result-sheet-title"
      className="print-sheet rounded-xl border border-border bg-card p-4 shadow-xs sm:p-8 print:rounded-none print:border-0 print:p-0 print:shadow-none"
    >
      {/* School header */}
      <header className="flex flex-col gap-4 border-b border-border pb-5 sm:flex-row sm:items-center sm:justify-between print:border-b-2 print:border-black">
        <BrandLogo asLink={false} />
        <div className="sm:text-right">
          <p className="type-caption font-semibold tracking-[0.14em] text-primary uppercase print:text-black">Student result sheet</p>
          <h2 id="result-sheet-title" className="type-section-title text-brand-950 print:text-black">
            {term}, {sheet.sessionName}
          </h2>
        </div>
      </header>

      {/* Student details */}
      <dl className="grid gap-x-8 gap-y-4 border-b border-border py-5 sm:grid-cols-2 lg:grid-cols-3 print:grid-cols-3">
        {details.map(([label, value]) => (
          <div key={label} className="flex flex-col gap-0.5">
            <dt className="type-caption font-normal text-muted-foreground print:text-black">{label}</dt>
            <dd className="type-label break-words text-foreground">{value}</dd>
          </div>
        ))}
      </dl>

      {/* Results table: scrolls inside its own container on narrow screens; the page itself never overflows */}
      <div
        role="region"
        aria-label="Results table"
        tabIndex={0}
        className="mt-5 overflow-x-auto rounded-lg border border-border outline-none max-sm:-mx-4 max-sm:rounded-none max-sm:border-x-0 focus-visible:ring-3 focus-visible:ring-ring/40 print:overflow-visible print:rounded-none print:border-black"
      >
        <table className="w-full min-w-0 border-collapse type-table sm:min-w-[34rem] print:min-w-0">
          <caption className="sr-only">
            Results for {fullName}, {term}, {sheet.sessionName}
          </caption>
          <thead>
            <tr className="border-b border-border bg-surface-subtle print:border-black print:bg-transparent">
              <th scope="col" className={`${cell} ${stickyFirst} bg-surface-subtle max-sm:pl-3 text-left text-[0.8125rem] font-semibold print:bg-transparent`}>
                Subject
              </th>
              {components.map((c) => (
                <th key={c.shortName} scope="col" className={`${cell} text-right text-[0.8125rem] font-semibold`}>
                  <span title={c.name}>{c.shortName}</span>
                  <span className="block type-caption font-normal text-muted-foreground print:text-black">/{formatScore(c.maxScore)}</span>
                </th>
              ))}
              <th scope="col" className={`${cell} text-right text-[0.8125rem] font-semibold`}>
                Total
              </th>
              <th scope="col" className={`${cell} text-center text-[0.8125rem] font-semibold`}>
                Grade
              </th>
              <th scope="col" className={`${cell} hidden text-left text-[0.8125rem] font-semibold sm:table-cell print:table-cell`}>
                Remark
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.subject} className="border-b border-border last:border-0 print:break-inside-avoid print:border-neutral-400">
                <th scope="row" className={`${cell} ${stickyFirst} bg-card max-sm:pl-3 text-left font-medium text-foreground`}>
                  {row.subject}
                  {row.remark && (
                    <span className="mt-0.5 block type-caption font-normal text-muted-foreground sm:hidden print:hidden">{row.remark}</span>
                  )}
                </th>
                {row.scores.map((score, i) => (
                  <td key={components[i].shortName} className={`${cell} text-right`}>
                    {score === null ? <span aria-label="not recorded">&mdash;</span> : formatScore(score)}
                  </td>
                ))}
                <td className={`${cell} text-right font-semibold`}>{row.total === null ? <span aria-label="not recorded">&mdash;</span> : formatScore(row.total)}</td>
                <td className={`${cell} text-center font-bold text-brand-800 print:text-black`}>{row.grade ?? <span aria-label="not recorded">&mdash;</span>}</td>
                <td className={`${cell} hidden text-muted-foreground sm:table-cell print:table-cell print:text-black`}>{row.remark ?? ""}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Summary */}
      <section aria-labelledby="result-summary-heading" className="mt-6 print:break-inside-avoid">
        <h3 id="result-summary-heading" className="type-card-title mb-3 text-foreground">
          Summary
        </h3>
        <dl className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {[
            ["Total subjects", String(summary.subjectCount)],
            ["Overall total", summary.overallTotal === null ? "—" : formatScore(summary.overallTotal)],
            ["Average score", summary.average === null ? "—" : formatScore(summary.average)],
          ].map(([label, value]) => (
            <div key={label} className="flex items-baseline justify-between gap-3 rounded-lg border border-brand-100 bg-surface-subtle px-4 py-3 sm:flex-col sm:items-start sm:gap-1 print:border-neutral-400 print:bg-transparent">
              <dt className="type-caption font-normal text-muted-foreground print:text-black">{label}</dt>
              <dd className="type-stat text-brand-950 print:text-black">{value}</dd>
            </div>
          ))}
        </dl>

        {summary.gradeCounts.length > 0 && (
          <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2">
            <p className="type-label text-foreground">Grade summary</p>
            <ul className="flex flex-wrap gap-2">
              {summary.gradeCounts.map(({ grade, count }) => (
                <li key={grade} className="rounded-full border border-brand-200 bg-secondary px-3 py-1 type-caption font-semibold text-secondary-foreground print:border-neutral-400 print:bg-transparent print:text-black">
                  {grade} &times; {count}
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>

      {/* Grading key from the scheme's own grade bands */}
      {gradeKey.length > 0 && (
        <section aria-labelledby="grading-key-heading" className="mt-6 print:break-inside-avoid">
          <h3 id="grading-key-heading" className="type-card-title mb-3 text-foreground">
            Grading key
          </h3>
          <ul className="grid gap-x-6 gap-y-1.5 sm:grid-cols-2 lg:grid-cols-3 print:grid-cols-3">
            {gradeKey.map((band) => (
              <li key={band.grade} className="flex items-baseline gap-2 type-body-sm text-foreground">
                <span className="w-8 font-bold text-brand-800 print:text-black">{band.grade}</span>
                <span className="tabular-nums text-muted-foreground print:text-black">
                  {formatScore(band.minScore)}&ndash;{formatScore(band.maxScore)}
                </span>
                <span>{band.remark}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <footer className="mt-8 border-t border-border pt-4 type-caption font-normal text-muted-foreground print:border-neutral-400 print:text-black">
        {sheet.publishedAt ? `Published on ${formatDate(sheet.publishedAt)}. ` : ""}
        Issued through the Zion Baptist High School student portal.
      </footer>
    </article>
  )
}

export { ResultSheetView }
