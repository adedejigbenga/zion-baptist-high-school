import Form from "next/form"
import Link from "next/link"
import { ChevronLeftIcon, ChevronRightIcon, CheckCircle2Icon, CircleDashedIcon, ClockIcon, EyeIcon, PencilLineIcon, XCircleIcon } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { SearchInput } from "@/components/ui/search-input"
import type { ResultStatus } from "@/generated/prisma/enums"
import type { AnnouncementRow } from "@/types/admin"

/** Page title with an optional description and actions. */
function PageHeader({ title, description, children }: { title: string; description?: string; children?: React.ReactNode }) {
  return (
    <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div className="flex flex-col gap-1.5">
        <h1 className="type-page-title text-brand-950">{title}</h1>
        {description && <p className="type-body text-muted-foreground">{description}</p>}
      </div>
      {children && <div className="flex flex-wrap items-center gap-2">{children}</div>}
    </header>
  )
}

function ActiveBadge({ active }: { active: boolean }) {
  return active ? (
    <Badge variant="success"><CheckCircle2Icon aria-hidden="true" />Active</Badge>
  ) : (
    <Badge variant="neutral"><XCircleIcon aria-hidden="true" />Inactive</Badge>
  )
}

function ResultStatusBadge({ status }: { status: ResultStatus }) {
  switch (status) {
    case "DRAFT":
      return <Badge variant="warning"><PencilLineIcon aria-hidden="true" />Draft</Badge>
    case "SUBMITTED":
      return <Badge variant="info"><ClockIcon aria-hidden="true" />Submitted</Badge>
    case "PUBLISHED":
      return <Badge variant="success"><EyeIcon aria-hidden="true" />Published</Badge>
  }
}

function AnnouncementStateBadge({ state }: { state: AnnouncementRow["state"] }) {
  switch (state) {
    case "DRAFT":
      return <Badge variant="neutral"><CircleDashedIcon aria-hidden="true" />Draft</Badge>
    case "LIVE":
      return <Badge variant="success"><EyeIcon aria-hidden="true" />Live</Badge>
    case "SCHEDULED":
      return <Badge variant="info"><ClockIcon aria-hidden="true" />Scheduled</Badge>
    case "EXPIRED":
      return <Badge variant="warning"><XCircleIcon aria-hidden="true" />Expired</Badge>
  }
}

/** A GET search form (next/form), preserving other filters through hidden inputs. */
function SearchBar({ action, query, label, placeholder }: { action: string; query: string; label: string; placeholder: string }) {
  return (
    <Form action={action} className="flex flex-col gap-2 sm:flex-row sm:items-end">
      <div className="flex flex-1 flex-col gap-2 sm:max-w-md">
        <Label htmlFor="admin-search">{label}</Label>
        <SearchInput id="admin-search" name="q" defaultValue={query} placeholder={placeholder} maxLength={80} autoComplete="off" />
      </div>
      <Button type="submit" variant="outline">Search</Button>
      {query && (
        <Link href={action} className="inline-flex min-h-11 items-center rounded-sm px-2 type-label text-primary hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">
          Clear
        </Link>
      )}
    </Form>
  )
}

/** Previous / next links that keep the current filters. `params` must not contain `page`. */
function Pagination({ basePath, params, page, pageCount, total, pageSize }: { basePath: string; params: Record<string, string>; page: number; pageCount: number; total: number; pageSize: number }) {
  const href = (p: number) => {
    const qs = new URLSearchParams(Object.entries(params).filter(([, v]) => v !== ""))
    if (p > 1) qs.set("page", String(p))
    const s = qs.toString()
    return s ? `${basePath}?${s}` : basePath
  }
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1
  const to = Math.min(total, page * pageSize)
  const linkClass = "inline-flex min-h-10 items-center gap-1 rounded-lg border border-input bg-card px-3 type-label hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
  return (
    <nav aria-label="Pagination" className="flex flex-wrap items-center justify-between gap-3">
      <p className="type-body-sm text-muted-foreground" data-testid="pagination-summary">
        {total === 0 ? "No records" : `Showing ${from}–${to} of ${total}`}
      </p>
      {pageCount > 1 && (
        <div className="flex items-center gap-2">
          {page > 1 ? (
            <Link href={href(page - 1)} className={linkClass} rel="prev"><ChevronLeftIcon className="size-4" aria-hidden="true" />Previous</Link>
          ) : null}
          <span className="type-body-sm text-muted-foreground">Page {page} of {pageCount}</span>
          {page < pageCount ? (
            <Link href={href(page + 1)} className={linkClass} rel="next">Next<ChevronRightIcon className="size-4" aria-hidden="true" /></Link>
          ) : null}
        </div>
      )}
    </nav>
  )
}

function EmptyRow({ children }: { children: React.ReactNode }) {
  return <p className="rounded-lg border border-dashed border-border bg-surface-subtle px-4 py-8 text-center type-body-sm text-muted-foreground">{children}</p>
}

/** Normalises a ?page= value. */
const toPage = (v: string | string[] | undefined) => {
  const n = Number(Array.isArray(v) ? v[0] : v)
  return Number.isInteger(n) && n >= 1 && n <= 100000 ? n : 1
}
const toText = (v: string | string[] | undefined, max = 80) => (Array.isArray(v) ? "" : (v ?? "").slice(0, max))

export { ActiveBadge, AnnouncementStateBadge, EmptyRow, PageHeader, Pagination, ResultStatusBadge, SearchBar, toPage, toText }
