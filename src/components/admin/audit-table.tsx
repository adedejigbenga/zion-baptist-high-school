import { EmptyRow } from "@/components/admin/common"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { formatDateTime } from "@/lib/format"
import type { AuditRow } from "@/types/admin"

/** Audit log rows. The summary was already stripped of secrets on the server; no raw metadata is ever passed in. */
function AuditTable({ rows, compact = false }: { rows: AuditRow[]; compact?: boolean }) {
  if (rows.length === 0) return <EmptyRow>No audit entries match.</EmptyRow>
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Date and time</TableHead>
          <TableHead>User</TableHead>
          <TableHead>Action</TableHead>
          {!compact && <TableHead className="hidden md:table-cell">Entity</TableHead>}
          {!compact && <TableHead className="hidden lg:table-cell">Entity ID</TableHead>}
          <TableHead className="hidden sm:table-cell">Details</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((r) => (
          <TableRow key={r.id}>
            <TableCell className="whitespace-nowrap">{formatDateTime(r.createdAt)}</TableCell>
            <TableCell>
              {r.userName ? (
                <span className="flex flex-col">
                  <span>{r.userName}</span>
                  <span className="type-caption font-normal text-muted-foreground">{r.userLoginId}</span>
                </span>
              ) : (
                <span className="text-muted-foreground">System / unknown</span>
              )}
            </TableCell>
            <TableCell className="font-mono text-xs break-all">{r.action}</TableCell>
            {!compact && <TableCell className="hidden md:table-cell">{r.entityType}</TableCell>}
            {!compact && <TableCell className="hidden font-mono text-xs break-all lg:table-cell">{r.entityId ?? "–"}</TableCell>}
            <TableCell className="hidden max-w-xs break-words sm:table-cell">{r.summary}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}

export { AuditTable }
