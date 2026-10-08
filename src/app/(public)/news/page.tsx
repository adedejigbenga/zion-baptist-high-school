import type { Metadata } from "next"
import { Suspense } from "react"
import Link from "next/link"
import { ArrowRightIcon, NewspaperIcon } from "lucide-react"

import { NewsCard, NewsVisual, dateFormat } from "@/components/home/news-section"
import { CtaBand, Section } from "@/components/site/blocks"
import { PageHero } from "@/components/site/page-hero"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { demoNews } from "@/lib/demo/news"
import { pageMetadata } from "@/lib/seo"
import { cn } from "@/lib/utils"

export const metadata: Metadata = pageMetadata({
  title: "News & Events",
  description: "The latest news, activities and events from Zion Baptist High School.",
  path: "/news",
})

const chip =
  "inline-flex min-h-10 items-center rounded-full border px-4 type-label transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"

/**
 * News listing. `?category=` filters the list; an unknown category shows the empty state.
 * TEMPORARY: reads the demo data; swap `demoNews` for the data layer when published news exists.
 */
type SearchParams = Promise<Record<string, string | string[] | undefined>>

export default function NewsPage({ searchParams }: { searchParams: SearchParams }) {
  return (
    <>
      <PageHero eyebrow="News & Events" title="What is happening at Zion" description="Updates, activities and events from around the school." trail={[{ label: "News & Events" }]} />
      {/* The category filter (?category=) is request-time data, so the listing streams in. */}
      <Suspense fallback={<div className="page-section"><div className="page-container"><Skeleton className="h-96 rounded-xl" role="status" aria-label="Loading news" /></div></div>}>
        <NewsListing searchParams={searchParams} />
      </Suspense>
      <CtaBand title="Stay in touch" description="Questions about school events or news? Contact the school office." primary={{ label: "Contact Us", href: "/contact" }} secondary={{ label: "Admissions", href: "/admissions" }} />
    </>
  )
}

async function NewsListing({ searchParams }: { searchParams: SearchParams }) {
  const { category: raw } = await searchParams
  const category = Array.isArray(raw) ? "" : (raw ?? "").slice(0, 40)

  const all = [...demoNews].sort((a, b) => b.date.localeCompare(a.date))
  const categories = [...new Set(all.map((n) => n.category))].sort()
  const items = category ? all.filter((n) => n.category === category) : all
  const [featured, ...rest] = items

  return (
    <>
      <Section id="news" eyebrow="Latest" title={category ? `${category} news` : "Latest news"}>
        <nav aria-label="News categories">
          <ul className="flex flex-wrap gap-2">
            <li>
              <Link href="/news" aria-current={category === "" ? "page" : undefined} className={cn(chip, category === "" ? "border-primary bg-primary text-primary-foreground" : "border-input bg-card text-foreground hover:bg-muted")}>
                All
              </Link>
            </li>
            {categories.map((c) => (
              <li key={c}>
                <Link href={`/news?category=${encodeURIComponent(c)}`} aria-current={category === c ? "page" : undefined} className={cn(chip, category === c ? "border-primary bg-primary text-primary-foreground" : "border-input bg-card text-foreground hover:bg-muted")}>
                  {c}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        {!featured ? (
          <Card variant="subtle" className="items-center py-10 text-center">
            <NewspaperIcon className="size-8 text-primary" aria-hidden="true" />
            <p className="type-label text-foreground">No news in this category yet</p>
            <p className="type-body-sm text-muted-foreground">Check back soon, or view all news.</p>
            <Link href="/news" className="type-label text-primary underline underline-offset-4">View all news</Link>
          </Card>
        ) : (
          <div className="flex flex-col gap-8">
            <Card interactive className="grid gap-0 overflow-hidden py-0 md:grid-cols-2">
              <NewsVisual item={featured} />
              <div className="flex flex-col justify-center gap-4 p-6 md:p-8">
                <div className="flex flex-wrap items-center gap-3">
                  <Badge>Featured</Badge>
                  <Badge variant="secondary">{featured.category}</Badge>
                  <time dateTime={featured.date} className="type-caption font-normal text-muted-foreground">{dateFormat.format(new Date(featured.date))}</time>
                </div>
                <h3 className="type-section-title text-balance text-foreground">{featured.title}</h3>
                <p className="type-body text-pretty text-muted-foreground">{featured.excerpt}</p>
                <Link href={`/news?category=${encodeURIComponent(featured.category)}`} className="inline-flex items-center gap-1.5 type-label text-primary hover:underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">
                  More {featured.category} news
                  <ArrowRightIcon className="size-4" aria-hidden="true" />
                </Link>
              </div>
            </Card>

            {rest.length > 0 && (
              <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {rest.map((item) => (
                  <li key={item.slug} className="flex">
                    <div className="w-full">
                      <NewsCard item={item} />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </Section>
    </>
  )
}
