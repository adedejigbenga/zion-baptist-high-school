import Link from "next/link"
import { ArrowRightIcon } from "lucide-react"

import { SchoolImage } from "@/components/site/school-image"
import { buttonVariants } from "@/components/ui/button"
import { welcomeHighlights } from "@/lib/public-content"

/** Two-column introduction: a large school photo beside the welcome text and four highlights. No statistics are claimed. */
function WelcomeSection() {
  return (
    <section aria-labelledby="welcome-heading" className="page-section">
      <div className="page-container grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
        <div className="relative">
          <div aria-hidden="true" className="absolute inset-0 top-4 left-4 rounded-2xl border border-brand-200 bg-brand-100 sm:top-6 sm:left-6" />
          <SchoolImage slot="welcome" className="relative aspect-[4/3] rounded-2xl border border-border shadow-md" />
        </div>

        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-3">
            <p className="type-caption font-semibold tracking-[0.14em] text-primary uppercase">Welcome to Zion Baptist High School</p>
            <h2 id="welcome-heading" className="type-section-title text-balance text-brand-900 md:text-[1.75rem] lg:text-[2rem]">
              Preparing Students for Excellence and Purpose
            </h2>
            <p className="type-body text-pretty text-muted-foreground">
              At Zion Baptist High School we educate the whole child. Strong teaching helps students master their
              subjects, while discipline, leadership and Christian values shape the kind of people they become. We
              work closely with families so that every student is known, encouraged and challenged to grow.
            </p>
          </div>

          <ul className="grid gap-5 sm:grid-cols-2">
            {welcomeHighlights.map(({ icon: Icon, title, description }) => (
              <li key={title} className="flex items-start gap-3">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-secondary text-primary">
                  <Icon className="size-5" aria-hidden="true" />
                </span>
                <div>
                  <h3 className="type-label text-foreground">{title}</h3>
                  <p className="mt-1 type-body-sm text-muted-foreground">{description}</p>
                </div>
              </li>
            ))}
          </ul>

          <Link href="/about" className={buttonVariants({ size: "lg", className: "self-start" })}>
            Learn More About Us
            <ArrowRightIcon aria-hidden="true" />
          </Link>
        </div>
      </div>
    </section>
  )
}

export { WelcomeSection }
