"use client"

import { AlertCircleIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card"

/** Shown when a student page fails to load (for example the database is briefly unreachable). Shows no details. */
export default function StudentError({ reset }: { error: Error; reset: () => void }) {
  return (
    <Card variant="subtle" className="max-w-xl" role="alert">
      <CardHeader className="gap-3">
        <span className="flex size-11 items-center justify-center rounded-lg bg-card text-destructive shadow-xs ring-1 ring-brand-100">
          <AlertCircleIcon className="size-5" aria-hidden="true" />
        </span>
        <h1 className="type-card-title text-foreground">Something went wrong</h1>
      </CardHeader>
      <CardContent className="flex flex-col items-start gap-4">
        <CardDescription>We could not load this page. Please try again in a moment.</CardDescription>
        <Button onClick={reset}>Try again</Button>
      </CardContent>
    </Card>
  )
}
