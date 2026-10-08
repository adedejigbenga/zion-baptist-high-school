import Link from "next/link"
import { ArrowRightIcon, ChevronDownIcon, type LucideIcon } from "lucide-react"
import { cn } from "cn"

import { SectionHeading } from "@/components/layout/section-heading"
import { buttonVariants } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import type { Feature } from "@/lib/public-content"

/** A page section with the standard heading block and rhythm. `tone="subtle"` gives it the lavender background. */
function Section({
  id,
  eyebrow,
  title,
  description,
  tone = "default",
  align = "left",
  action,
  children,
  className,
}: {
  id?: string
  eyebrow?: string
  title: React.ReactNode
  description?: React.ReactNode
  tone?: "default" | "subtle"
  align?: "left" | "center"
  /** Optional element to the right of the heading (e.g. a "View all" link). */
  action?: React.ReactNode
  children?: React.ReactNode
  className?: string
}) {
  const headingId = id ? `${id}-heading` : undefined
  return (
    <section id={id} aria-labelledby={headingId} className={cn("page-section scroll-mt-24", tone === "subtle" && "bg-surface-subtle", className)}>
      <div className="page-container flex flex-col gap-10 lg:gap-12">
        <div className={cn("flex flex-col gap-6 md:flex-row md:items-end", action ? "md:justify-between" : "", align === "center" && "md:justify-center")}>
          <SectionHeading eyebrow={eyebrow} id={headingId} title={title} description={description} align={align} />
          {action}
        </div>
        {children}
      </div>
    </section>
  )
}

/** Icon, title and short text on a card with a gentle hover lift. */
function FeatureCard({ icon: Icon, title, description }: Feature) {
  return (
    <Card className="h-full gap-4 transition-[transform,box-shadow] duration-200 motion-safe:hover:-translate-y-0.5 hover:shadow-md">
      <CardContent className="flex flex-col gap-4">
        <span className="flex size-12 items-center justify-center rounded-xl bg-secondary text-primary">
          <Icon className="size-6" aria-hidden="true" />
        </span>
        <h3 className="type-card-title text-foreground">{title}</h3>
        <p className="type-body-sm text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  )
}

function FeatureGrid({ items, columns = 4 }: { items: Feature[]; columns?: 2 | 3 | 4 }) {
  return (
    <ul className={cn("grid gap-5 sm:grid-cols-2", columns === 3 && "lg:grid-cols-3", columns === 4 && "lg:grid-cols-4")}>
      {items.map((item) => (
        <li key={item.title}>
          <FeatureCard {...item} />
        </li>
      ))}
    </ul>
  )
}

/** Full-width purple call to action. */
function CtaBand({
  title,
  description,
  primary,
  secondary,
}: {
  title: string
  description: string
  primary: { label: string; href: string }
  secondary?: { label: string; href: string }
}) {
  return (
    <section aria-labelledby="cta-heading" className="relative isolate overflow-hidden bg-brand-gradient">
      <div aria-hidden="true" className="absolute -top-24 -left-16 -z-10 size-72 rounded-full border border-white/15" />
      <div aria-hidden="true" className="absolute -right-12 -bottom-28 -z-10 size-72 rounded-full bg-white/5" />
      <div className="page-container grid items-center gap-8 py-12 md:grid-cols-[1fr_auto] md:gap-12 lg:py-16">
        <div className="flex max-w-2xl flex-col gap-3">
          <h2 id="cta-heading" className="type-section-title text-balance text-white md:text-[1.75rem] lg:text-[2.25rem]">
            {title}
          </h2>
          <p className="type-body text-pretty text-brand-100 md:text-lg">{description}</p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row md:flex-col lg:flex-row">
          <Link href={primary.href} className={buttonVariants({ variant: "inverse", size: "lg" })}>
            {primary.label}
            <ArrowRightIcon aria-hidden="true" />
          </Link>
          {secondary && (
            <Link
              href={secondary.href}
              className={buttonVariants({ variant: "outline", size: "lg", className: "border-white/60 bg-transparent text-white hover:border-white hover:bg-white/10 hover:text-white" })}
            >
              {secondary.label}
            </Link>
          )}
        </div>
      </div>
    </section>
  )
}

/** Numbered journey (admissions). */
function Steps({ steps }: { steps: { title: string; description: string; icon: LucideIcon }[] }) {
  return (
    <ol className="grid gap-5 sm:grid-cols-2 lg:grid-cols-5">
      {steps.map((step, index) => (
        <li key={step.title} className="relative flex">
          <Card className="h-full w-full gap-3">
            <CardContent className="flex flex-col gap-3">
              <div className="flex items-center gap-3">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary type-label font-bold text-primary-foreground" aria-hidden="true">
                  {index + 1}
                </span>
                <step.icon className="size-5 text-primary" aria-hidden="true" />
              </div>
              <h3 className="type-card-title text-foreground">
                <span className="sr-only">Step {index + 1}: </span>
                {step.title}
              </h3>
              <p className="type-body-sm text-muted-foreground">{step.description}</p>
            </CardContent>
          </Card>
        </li>
      ))}
    </ol>
  )
}

/** Accessible accordion using native <details>: keyboard and screen-reader friendly with no JavaScript. */
function Faq({ items }: { items: { question: string; answer: string }[] }) {
  return (
    <div className="flex flex-col gap-3">
      {items.map((item) => (
        <details key={item.question} className="group rounded-xl border border-border bg-card shadow-xs open:shadow-sm">
          <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-4 rounded-xl px-5 py-3 type-label text-foreground marker:hidden focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring [&::-webkit-details-marker]:hidden">
            <span className="text-base">{item.question}</span>
            <ChevronDownIcon className="size-5 shrink-0 text-primary transition-transform group-open:rotate-180" aria-hidden="true" />
          </summary>
          <p className="px-5 pb-5 type-body-sm text-muted-foreground">{item.answer}</p>
        </details>
      ))}
    </div>
  )
}

/** Marks information the school still has to confirm, so placeholders are easy to find and replace. */
function ToBeConfirmed({ children = "To be confirmed by the school" }: { children?: React.ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full border border-warning-soft-border bg-warning-soft px-2.5 py-0.5 type-caption text-warning-soft-foreground">
      {children}
    </span>
  )
}

export { CtaBand, Faq, FeatureCard, FeatureGrid, Section, Steps, ToBeConfirmed }
