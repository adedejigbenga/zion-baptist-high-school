import { MegaphoneIcon } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { formatDate } from "@/lib/format"
import type { StudentAnnouncementItem } from "@/types/student"

const THREE_DAYS = 3 * 24 * 60 * 60 * 1000

/** The student's announcements, newest first. The text is rendered as plain text (never HTML). */
function AnnouncementList({ announcements, now }: { announcements: StudentAnnouncementItem[]; now: Date }) {
  if (announcements.length === 0) {
    return (
      <Card variant="subtle" className="max-w-2xl">
        <div className="flex flex-col items-center gap-3 px-(--card-spacing) py-8 text-center">
          <span className="flex size-12 items-center justify-center rounded-lg bg-card text-primary ring-1 ring-brand-100">
            <MegaphoneIcon className="size-6" aria-hidden="true" />
          </span>
          <div className="flex flex-col gap-1">
            <p className="type-label text-foreground">No announcements right now</p>
            <p className="type-body-sm max-w-sm text-muted-foreground">
              News and notices from the school will appear here when they are published.
            </p>
          </div>
        </div>
      </Card>
    )
  }

  return (
    <ul className="flex max-w-3xl flex-col gap-4">
      {announcements.map((a, index) => {
        const soon = a.expiresAt !== null && a.expiresAt.getTime() - now.getTime() < THREE_DAYS
        return (
          <li key={`${index}-${a.title}`}>
            <Card className="gap-3">
              <article className="flex flex-col gap-3 px-(--card-spacing)">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant={a.category === "Class" ? "default" : "secondary"}>
                    {a.category === "Class" ? (a.className ?? "Class") : "School-wide"}
                  </Badge>
                  {a.publishedAt && (
                    <time dateTime={a.publishedAt.toISOString()} className="type-caption font-normal text-muted-foreground">
                      {formatDate(a.publishedAt)}
                    </time>
                  )}
                </div>
                <h2 className="type-card-title break-words text-foreground">{a.title}</h2>
                <p className="type-body whitespace-pre-line break-words text-muted-foreground">{a.content}</p>
                {a.expiresAt && (
                  <p className="type-caption font-normal text-muted-foreground">
                    {soon ? "Ending soon: " : "Shown until "}
                    <time dateTime={a.expiresAt.toISOString()}>{formatDate(a.expiresAt)}</time>
                  </p>
                )}
              </article>
            </Card>
          </li>
        )
      })}
    </ul>
  )
}

export { AnnouncementList }
