import type { Metadata } from "next"
import Link from "next/link"
import { ArrowRightIcon, ClipboardCheckIcon, GraduationCapIcon, SchoolIcon, UserRoundCogIcon, type LucideIcon } from "lucide-react"

import { AuditTable } from "@/components/admin/audit-table"
import { PageHeader } from "@/components/admin/common"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { TERM_LABEL } from "@/lib/academic"
import { getAdminOverview, getAdminProfileSummary } from "@/lib/services/admin"

export const metadata: Metadata = { title: "Admin Dashboard" }

function StatCard({ label, value, icon: Icon, href, hint }: { label: string; value: number; icon: LucideIcon; href: string; hint: string }) {
  return (
    <Card size="sm" interactive>
      <CardContent className="flex items-center gap-4">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-secondary text-primary">
          <Icon className="size-5" aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <Link href={href} className="type-caption text-muted-foreground after:absolute after:inset-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">
            {label}
          </Link>
          <p className="type-page-title text-brand-950" data-testid={`stat-${label.toLowerCase().replace(/\s+/g, "-")}`}>{value}</p>
          <p className="type-caption font-normal text-muted-foreground">{hint}</p>
        </div>
      </CardContent>
    </Card>
  )
}

export default async function AdminDashboardPage() {
  const [profile, overview] = await Promise.all([getAdminProfileSummary(), getAdminOverview()])
  return (
    <div className="stack-page">
      <PageHeader title={`Welcome, ${profile.firstName} ${profile.lastName}`} description="School administration overview.">
        <Badge variant="secondary">Session: {overview.sessionName ?? "Not set"}</Badge>
        <Badge variant="secondary">Term: {overview.termName ? TERM_LABEL[overview.termName] : "Not set"}</Badge>
      </PageHeader>

      <section aria-label="Summary" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total Students" value={overview.totalStudents} icon={GraduationCapIcon} href="/portal/admin/students" hint="Active accounts" />
        <StatCard label="Total Teachers" value={overview.totalTeachers} icon={UserRoundCogIcon} href="/portal/admin/teachers" hint="Active accounts" />
        <StatCard label="Active Classes" value={overview.activeClasses} icon={SchoolIcon} href="/portal/admin/classes" hint="Open for enrolment" />
        <StatCard label="Results Awaiting Publication" value={overview.awaitingPublication} icon={ClipboardCheckIcon} href="/portal/admin/results?status=SUBMITTED" hint="Submitted by teachers" />
      </section>

      <Card className="gap-0">
        <CardHeader className="flex flex-row items-center justify-between gap-3 pb-4">
          <h2 className="type-card-title text-foreground">Recent activity</h2>
          <Link href="/portal/admin/audit-logs" className="inline-flex items-center gap-1.5 rounded-sm type-label text-primary hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">
            All audit logs
            <ArrowRightIcon className="size-4" aria-hidden="true" />
          </Link>
        </CardHeader>
        <CardContent>
          <AuditTable rows={overview.recent} compact />
        </CardContent>
      </Card>
    </div>
  )
}
