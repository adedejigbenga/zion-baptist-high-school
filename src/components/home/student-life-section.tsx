import Link from "next/link"
import { ArrowRightIcon } from "lucide-react"

import { Section } from "@/components/site/blocks"
import { SchoolImage } from "@/components/site/school-image"
import { buttonVariants } from "@/components/ui/button"
import { studentLife } from "@/lib/public-content"
import { cn } from "@/lib/utils"

/** Photo gallery of student activities. Each tile is captioned, so the placeholder labels are hidden. */
function GalleryGrid({ className }: { className?: string }) {
  return (
    <ul className={cn("grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-6", className)}>
      {studentLife.map(({ slot, title }, index) => (
        <li key={slot} className={cn("relative overflow-hidden rounded-xl", index < 2 ? "md:col-span-3" : "md:col-span-2", index === 4 && "max-md:col-span-2")}>
          <SchoolImage slot={slot} showLabel={false} sizes="(min-width: 768px) 33vw, 50vw" className={cn("w-full", index < 2 ? "aspect-[4/3] md:aspect-[16/9]" : "aspect-[4/3]")} />
          <div className="absolute inset-x-0 bottom-0 bg-linear-to-t from-brand-950/85 to-transparent px-4 pt-10 pb-3">
            <p className="type-label text-white">{title}</p>
          </div>
        </li>
      ))}
    </ul>
  )
}

function StudentLifeSection() {
  return (
    <Section
      id="student-life"
      tone="subtle"
      eyebrow="Student Life"
      title="Learning Beyond the Classroom"
      description="Sport, science, the arts and school events give students room to discover their talents and grow in confidence."
      action={
        <Link href="/student-life#gallery" className={buttonVariants({ variant: "outline", className: "self-start md:self-auto" })}>
          View Gallery
          <ArrowRightIcon aria-hidden="true" />
        </Link>
      }
    >
      <GalleryGrid />
    </Section>
  )
}

export { GalleryGrid, StudentLifeSection }
