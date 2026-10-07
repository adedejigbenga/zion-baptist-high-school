import Link from "next/link"
import Image from "next/image"
import { ArrowRightIcon, BookOpenIcon, CalendarDaysIcon, UsersIcon, type LucideIcon } from "lucide-react"

import { SectionHeading } from "@/components/layout/section-heading"
import { Badge } from "@/components/ui/badge"
import { buttonVariants } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import type { NewsItem } from "@/types/news"

const visualIcons: Record<NewsItem["visual"], LucideIcon> = {
  academics: BookOpenIcon,
  students: UsersIcon,
  community: CalendarDaysIcon,
}

const dateFormat = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "UTC",
})

/** Photo when the item has one, otherwise a tasteful illustrated placeholder. */
function NewsVisual({ item }: { item: NewsItem }) {
  if (item.image) {
    return (
      <div className="relative aspect-[16/10] bg-brand-50">
        <Image
          src={item.image.src}
          alt={item.image.alt}
          fill
          sizes="(min-width: 768px) 33vw, 100vw"
          className="object-cover"
        />
      </div>
    )
  }
  const Icon = visualIcons[item.visual]
  return (
    <div
      aria-hidden="true"
      className="relative flex aspect-[16/10] items-center justify-center overflow-hidden bg-linear-to-br from-brand-100 to-brand-200"
    >
      <div className="absolute -top-10 -right-10 size-36 rounded-full bg-white/40" />
      <div className="absolute -bottom-12 -left-8 size-32 rounded-full bg-brand-300/40" />
      <span className="relative flex size-16 items-center justify-center rounded-xl bg-card text-primary shadow-sm">
        <Icon className="size-8" />
      </span>
    </div>
  )
}

function NewsCard({ item }: { item: NewsItem }) {
  return (
    <Card interactive className="h-full gap-0 py-0">
      <NewsVisual item={item} />
      <div className="flex flex-1 flex-col gap-3 p-5">
        <div className="flex items-center justify-between gap-3">
          <Badge variant="secondary">{item.category}</Badge>
          <time dateTime={item.date} className="type-caption font-normal text-muted-foreground">
            {dateFormat.format(new Date(item.date))}
          </time>
        </div>
        <h3 className="type-card-title text-balance text-foreground">{item.title}</h3>
        <p className="type-body-sm text-pretty text-muted-foreground">{item.excerpt}</p>
        {/* Stretched link: the whole card is clickable, but only this one link is focusable */}
        <Link
          href={item.href ?? "/news"}
          aria-label={`Read more: ${item.title}`}
          className="mt-auto inline-flex items-center gap-1.5 pt-2 type-label text-primary outline-none after:absolute after:inset-0 after:content-[''] hover:underline underline-offset-4"
        >
          Read More
          <ArrowRightIcon className="size-4" aria-hidden="true" />
        </Link>
      </div>
    </Card>
  )
}

/** Takes plain NewsItem[]: swap the demo data for database content later without touching this component. */
function NewsSection({ items }: { items: NewsItem[] }) {
  return (
    <section aria-labelledby="news-heading" className="page-section">
      <div className="page-container flex flex-col gap-10 lg:gap-12">
        <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
          <SectionHeading
            eyebrow="News & Events"
            id="news-heading"
            title="Life at Zion Baptist High School"
            description="Recent updates and activities from around the school."
          />
          <Link href="/news" className={buttonVariants({ variant: "outline", className: "self-start md:self-auto" })}>
            View All News
            <ArrowRightIcon aria-hidden="true" />
          </Link>
        </div>

        <ul className="grid gap-6 md:grid-cols-3">
          {items.map((item) => (
            <li key={item.slug} className="flex">
              <div className="w-full">
                <NewsCard item={item} />
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}

export { NewsSection }
