import Link from "next/link"
import { ArrowLeftIcon, HourglassIcon } from "lucide-react"

import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card"

/**
 * TEMPORARY content for student pages that are not built yet (results, profile, announcements), so the
 * navigation never leads to a 404. It shows no data of any kind.
 */
function ComingSoon({ title }: { title: string }) {
  return (
    <div className="stack-page max-w-xl">
      <h1 className="type-page-title text-brand-950">{title}</h1>
      <Card variant="subtle">
        <CardHeader className="gap-3">
          <span className="flex size-11 items-center justify-center rounded-lg bg-card text-primary shadow-xs ring-1 ring-brand-100">
            <HourglassIcon className="size-5" aria-hidden="true" />
          </span>
          <h2 className="type-card-title text-foreground">Coming soon</h2>
        </CardHeader>
        <CardContent>
          <CardDescription>This page is being prepared.</CardDescription>
        </CardContent>
      </Card>
      <Link
        href="/portal/student"
        className="inline-flex w-fit items-center gap-2 rounded-sm type-label text-primary hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
      >
        <ArrowLeftIcon className="size-4" aria-hidden="true" />
        Back to dashboard
      </Link>
    </div>
  )
}

export { ComingSoon }
