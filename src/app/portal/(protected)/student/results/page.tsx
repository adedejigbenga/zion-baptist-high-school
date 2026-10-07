import type { Metadata } from "next"
import { redirect } from "next/navigation"

import { PrintButton } from "@/components/student/print-button"
import { NoTermsCard, ResultNotPublished } from "@/components/student/result-not-published"
import { ResultSheetView } from "@/components/student/result-sheet"
import { TermSelector } from "@/components/student/term-selector"
import { getStudentResultView } from "@/lib/services/student"

export const metadata: Metadata = { title: "My Results" }

/**
 * The student result viewer. There is no student ID anywhere: the student is whoever is signed in. The optional
 * `?term=` value is only a term reference, matched against that student's own terms on the server.
 * Marks are only ever present for a PUBLISHED result; every other state carries none (see services/results.ts).
 */
export default async function StudentResultsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const { term } = await searchParams
  // A repeated ?term=a&term=b is treated as an invalid key rather than guessed at.
  const requested = Array.isArray(term) ? "" : term

  const view = await getStudentResultView(requested)
  if (view.kind === "UNKNOWN_TERM") redirect("/portal/student/results")

  return (
    <div className="stack-page">
      <header className="flex flex-col gap-1.5 print:hidden">
        <h1 className="type-page-title text-brand-950">My Results</h1>
        <p className="type-body text-muted-foreground">View your published results for each term.</p>
      </header>

      {view.kind === "NO_TERMS" ? (
        <NoTermsCard />
      ) : (
        <>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between print:hidden">
            <TermSelector terms={view.terms} selectedKey={view.selected.key} />
            {view.kind === "PUBLISHED" && <PrintButton />}
          </div>

          {view.kind === "PUBLISHED" ? <ResultSheetView sheet={view.sheet} /> : <ResultNotPublished termLabel={view.selected.label} />}
        </>
      )}
    </div>
  )
}
