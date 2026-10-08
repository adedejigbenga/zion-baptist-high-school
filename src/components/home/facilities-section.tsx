import Link from "next/link"
import { ArrowRightIcon } from "lucide-react"

import { Section } from "@/components/site/blocks"
import { SchoolImage } from "@/components/site/school-image"
import { buttonVariants } from "@/components/ui/button"
import { facilities } from "@/lib/public-content"
import { cn } from "@/lib/utils"

/** Facility cards: photo, icon badge, title and text. Three on the first row, two wider ones below, on large screens. */
function FacilityCards({ className }: { className?: string }) {
  return (
    <ul className={cn("grid gap-5 sm:grid-cols-2 lg:grid-cols-6", className)}>
      {facilities.map(({ slot, icon: Icon, title, description }, index) => (
        <li key={slot} className={cn("flex", index < 3 ? "lg:col-span-2" : "lg:col-span-3", index === 4 && "max-lg:sm:col-span-2")}>
          <article className="flex w-full flex-col overflow-hidden rounded-xl border border-border bg-card shadow-xs transition-[transform,box-shadow] duration-200 motion-safe:hover:-translate-y-0.5 hover:shadow-md">
            <div className="relative">
              <SchoolImage slot={slot} sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw" className="aspect-[16/10]" />
              <span className="absolute -bottom-5 left-5 flex size-11 items-center justify-center rounded-full border-4 border-card bg-primary text-primary-foreground shadow-sm">
                <Icon className="size-5" aria-hidden="true" />
              </span>
            </div>
            <div className="flex flex-col gap-1.5 px-5 pt-8 pb-5">
              <h3 className="type-card-title text-foreground">{title}</h3>
              <p className="type-body-sm text-muted-foreground">{description}</p>
            </div>
          </article>
        </li>
      ))}
    </ul>
  )
}

function FacilitiesSection() {
  return (
    <Section
      id="facilities"
      eyebrow="Facilities"
      title="Modern Learning Environment"
      description="Spaces that support focused study, practical work, reading and play."
      action={
        <Link href="/facilities" className={buttonVariants({ variant: "outline", className: "self-start md:self-auto" })}>
          View All Facilities
          <ArrowRightIcon aria-hidden="true" />
        </Link>
      }
    >
      <FacilityCards />
    </Section>
  )
}

export { FacilitiesSection, FacilityCards }
