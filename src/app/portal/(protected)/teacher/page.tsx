import type { Metadata } from "next"
import { BookOpenIcon, CheckCircle2Icon, ClockIcon, PencilLineIcon, UsersIcon, type LucideIcon } from "lucide-react"

import Link from "next/link"

import { AnnouncementList } from "@/components/student/announcement-list"
import { AssignmentsList } from "@/components/teacher/assignments-list"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { TERM_LABEL } from "@/lib/academic"
import { getTeacherAnnouncements, getTeacherOverview, getTeacherProfileSummary } from "@/lib/services/teacher"

export const metadata: Metadata = { title: "Teacher Dashboard" }

function StatCard({ label, value, icon: Icon, hint }: { label: string; value: number; icon: LucideIcon; hint: string }) {
  return (
    <Card size="sm">
      <CardContent className="flex items-center gap-4">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-secondary text-primary">
          <Icon className="size-5" aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <p className="type-caption font-normal text-muted-foreground">{label}</p>
          <p className="type-page-title text-brand-950" data-testid={`stat-${label.toLowerCase().replace(/\s+/g, "-")}`}>
            {value}
          </p>
          <p className="type-caption font-normal text-muted-foreground">{hint}</p>
        </div>
      </CardContent>
    </Card>
  )
}

export default async function TeacherDashboardPage() {
  const [profile, overview, announcements] = await Promise.all([getTeacherProfileSummary(), getTeacherOverview(), getTeacherAnnouncements(3)])
  const { totals } = overview

  return (
    <div className="stack-page">
      <div className="flex flex-col gap-2">
        <h1 className="type-page-title text-brand-950">
          Welcome, {profile.firstName} {profile.lastName}
        </h1>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary">Session: {overview.sessionName ?? "Not set"}</Badge>
          <Badge variant="secondary">Term: {overview.termName ? TERM_LABEL[overview.termName] : "Not set"}</Badge>
        </div>
      </div>

      <section aria-label="Summary" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Assigned Classes" value={totals.classes} icon={UsersIcon} hint="This session" />
        <StatCard label="Assigned Subjects" value={totals.subjects} icon={BookOpenIcon} hint="This session" />
        <StatCard label="Results Pending" value={totals.pending} icon={PencilLineIcon} hint="Students still to submit" />
        <StatCard label="Results Submitted" value={totals.submitted} icon={CheckCircle2Icon} hint="Awaiting or past publication" />
      </section>

      <section className="flex flex-col gap-4" aria-labelledby="my-classes-heading">
        <h2 id="my-classes-heading" className="type-section-title text-foreground">
          My classes
        </h2>
        <AssignmentsList assignments={overview.assignments} />
        {totals.submitted > 0 && (
          <p className="flex items-start gap-2 type-body-sm text-muted-foreground">
            <ClockIcon className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
            Submitted results are awaiting administrative publication. Students cannot see them until an administrator
            publishes them.
          </p>
        )}
      </section>

      <section className="flex flex-col gap-4" aria-labelledby="teacher-announcements-heading">
        <div className="flex items-center justify-between gap-3">
          <h2 id="teacher-announcements-heading" className="type-section-title text-foreground">
            Announcements
          </h2>
          <Link href="/portal/teacher/announcements" className="type-label text-primary hover:underline">
            View all
          </Link>
        </div>
        <AnnouncementList announcements={announcements} now={new Date()} />
      </section>
    </div>
  )
}
