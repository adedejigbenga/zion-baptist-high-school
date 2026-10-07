import Link from "next/link"
import { ArrowRightIcon, MegaphoneIcon } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { formatDate } from "@/lib/format"
import { cn } from "@/lib/utils"
import type { StudentAnnouncement } from "@/types/student"

/** Recent announcements for this student (the list is already filtered on the server). Includes a friendly empty state. */
function RecentAnnouncements({ announcements, className }: { announcements: StudentAnnouncement[]; className?: string }) {
  return (
    <Card className={cn("gap-0", className)}>
      <CardHeader className="flex flex-row items-center justify-between gap-3 pb-4">
        <h2 className="type-card-title text-foreground">Recent announcements</h2>
        <Link
          href="/portal/student/announcements"
          className="inline-flex items-center gap-1.5 rounded-sm type-label text-primary hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          View all
          <ArrowRightIcon className="size-4" aria-hidden="true" />
        </Link>
      </CardHeader>
      <CardContent className="px-0">
        {announcements.length === 0 ? (
          <div className="flex flex-col items-center gap-3 px-(--card-spacing) py-8 text-center">
            <span className="flex size-12 items-center justify-center rounded-lg bg-brand-100 text-primary">
              <MegaphoneIcon className="size-6" aria-hidden="true" />
            </span>
            <div className="flex flex-col gap-1">
              <p className="type-label text-foreground">No announcements right now</p>
              <p className="type-body-sm max-w-sm text-muted-foreground">
                News and notices from the school will appear here when they are published.
              </p>
            </div>
          </div>
        ) : (
          <ul className="flex flex-col divide-y divide-border border-t border-border">
            {announcements.map((a, index) => (
              <li key={`${index}-${a.title}`} className="flex flex-col gap-1.5 px-(--card-spacing) py-4">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  <h3 className="type-label text-foreground">{a.title}</h3>
                  {a.className && <Badge variant="secondary">{a.className}</Badge>}
                  {a.publishedAt && (
                    <time dateTime={a.publishedAt.toISOString()} className="type-caption font-normal text-muted-foreground">
                      {formatDate(a.publishedAt)}
                    </time>
                  )}
                </div>
                <p className="type-body-sm text-muted-foreground">{a.excerpt}</p>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}

export { RecentAnnouncements }
