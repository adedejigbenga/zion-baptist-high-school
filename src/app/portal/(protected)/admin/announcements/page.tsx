import type { Metadata } from "next"
import Form from "next/form"
import Link from "next/link"

import { AnnouncementsManager } from "@/components/admin/announcements-manager"
import { PageHeader, toText } from "@/components/admin/common"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { NativeSelect } from "@/components/ui/native-select"
import { getAnnouncements } from "@/lib/services/admin"

export const metadata: Metadata = { title: "Announcements" }

const STATES = [
  { value: "", label: "All" },
  { value: "draft", label: "Draft (unpublished)" },
  { value: "live", label: "Live" },
  { value: "scheduled", label: "Scheduled" },
  { value: "expired", label: "Expired" },
]

export default async function AdminAnnouncementsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams
  const q = toText(params.q)
  const requestedState = toText(params.state, 12)
  const state = STATES.some((s) => s.value === requestedState) ? requestedState : ""
  const target = toText(params.target, 40)
  const { announcements, targets } = await getAnnouncements({ q, state, target })
  const filtered = Boolean(q || state || target)

  return (
    <div className="stack-page">
      <PageHeader title="Announcements" description="Create, edit and publish notices for the whole school or one class." />

      <Form action="/portal/admin/announcements" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-[2fr_1fr_1fr_auto] lg:items-end">
        <div className="flex flex-col gap-2">
          <Label htmlFor="ann-q">Search</Label>
          <input id="ann-q" name="q" defaultValue={q} placeholder="Title or text" maxLength={80} autoComplete="off" className="min-h-11 w-full rounded-lg border border-input bg-card px-3 type-body focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring" />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="ann-state">Status</Label>
          <NativeSelect id="ann-state" name="state" defaultValue={state}>
            {STATES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
          </NativeSelect>
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="ann-target">Audience</Label>
          <NativeSelect id="ann-target" name="target" defaultValue={target}>
            <option value="">Everyone</option>
            <option value="school">Whole school</option>
            {targets.map((t) => <option key={t.key} value={t.key}>{t.label}</option>)}
          </NativeSelect>
        </div>
        <div className="flex items-center gap-2">
          <Button type="submit" variant="outline">Apply</Button>
          {filtered && (
            <Link href="/portal/admin/announcements" className="inline-flex min-h-11 items-center rounded-sm px-2 type-label text-primary hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">
              Clear
            </Link>
          )}
        </div>
      </Form>

      <AnnouncementsManager announcements={announcements} targets={targets} filtered={filtered} />
    </div>
  )
}
