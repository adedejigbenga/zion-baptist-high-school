import Link from "next/link"
import { ArrowRightIcon, BookOpenIcon, CompassIcon, SproutIcon, type LucideIcon } from "lucide-react"

import { SectionHeading } from "@/components/layout/section-heading"
import { Card } from "@/components/ui/card"
import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"

const pillars: { icon: LucideIcon; title: string; text: string; offset: string }[] = [
  { icon: BookOpenIcon, title: "Learn", text: "A strong academic foundation in every subject.", offset: "" },
  { icon: SproutIcon, title: "Grow", text: "Confidence, friendships and personal responsibility.", offset: "sm:ml-8" },
  { icon: CompassIcon, title: "Lead", text: "Good character, discipline and a sense of purpose.", offset: "sm:ml-16" },
]

function AboutSection() {
  return (
    <section aria-labelledby="about-heading" className="page-section">
      <div className="page-container grid items-center gap-12 lg:grid-cols-2 lg:gap-20">
        <div className="flex flex-col items-start gap-6">
          <SectionHeading eyebrow="About Us" id="about-heading" title="Learning With Purpose" />
          <div className="flex flex-col gap-4 type-body text-pretty text-muted-foreground">
            <p>
              At Zion Baptist High School, we give students a place where they can learn well, grow in
              confidence and develop strong character.
            </p>
            <p>
              Our teachers work closely with families to help each student do their best, in the classroom and
              beyond it.
            </p>
          </div>
          <Link href="/about" className={buttonVariants({ variant: "outline", size: "lg" })}>
            Discover Our School
            <ArrowRightIcon aria-hidden="true" />
          </Link>
        </div>

        <div className="relative">
          <div
            aria-hidden="true"
            className="absolute -inset-3 rounded-xl border border-brand-100 bg-surface-subtle sm:-inset-5"
          />
          <ul className="relative flex flex-col gap-4 p-1 sm:p-2">
            {pillars.map(({ icon: Icon, title, text, offset }) => (
              <li key={title} className={cn(offset)}>
                <Card size="sm" className="flex-row items-center gap-4 px-4 py-4">
                  <span className="flex size-12 shrink-0 items-center justify-center rounded-lg bg-brand-100 text-primary">
                    <Icon className="size-6" aria-hidden="true" />
                  </span>
                  <div>
                    <h3 className="type-card-title text-foreground">{title}</h3>
                    <p className="type-body-sm text-muted-foreground">{text}</p>
                  </div>
                </Card>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  )
}

export { AboutSection }
