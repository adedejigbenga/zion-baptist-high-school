import type { Metadata } from "next"
import Form from "next/form"
import Link from "next/link"

import { AuditTable } from "@/components/admin/audit-table"
import { PageHeader, Pagination, toPage, toText } from "@/components/admin/common"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { NativeSelect } from "@/components/ui/native-select"
import { getAuditFilterOptions, getAuditLogs } from "@/lib/services/admin"

export const metadata: Metadata = { title: "Audit Logs" }

export default async function AdminAuditLogsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams
  const action = toText(params.action, 60)
  const entityType = toText(params.entity, 60)
  const [options, data] = await Promise.all([getAuditFilterOptions(), getAuditLogs({ page: toPage(params.page), action, entityType })])

  return (
    <div className="stack-page">
      <PageHeader title="Audit Logs" description="A permanent record of important actions. Passwords, hashes and tokens are never shown." />
      <Form action="/portal/admin/audit-logs" className="grid gap-4 sm:grid-cols-[1fr_1fr_auto_auto] sm:items-end">
        <div className="flex flex-col gap-2">
          <Label htmlFor="audit-action">Action</Label>
          <NativeSelect id="audit-action" name="action" defaultValue={action}>
            <option value="">All actions</option>
            {options.actions.map((a) => <option key={a} value={a}>{a}</option>)}
          </NativeSelect>
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="audit-entity">Entity type</Label>
          <NativeSelect id="audit-entity" name="entity" defaultValue={entityType}>
            <option value="">All entities</option>
            {options.entityTypes.map((e) => <option key={e} value={e}>{e}</option>)}
          </NativeSelect>
        </div>
        <Button type="submit" variant="outline">Apply filters</Button>
        {(action || entityType) && (
          <Link href="/portal/admin/audit-logs" className="inline-flex min-h-11 items-center rounded-sm px-2 type-label text-primary hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">Clear</Link>
        )}
      </Form>
      <AuditTable rows={data.rows} />
      <Pagination basePath="/portal/admin/audit-logs" params={{ action, entity: entityType }} page={data.page} pageCount={data.pageCount} total={data.total} pageSize={data.pageSize} />
    </div>
  )
}
