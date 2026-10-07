import { CrossIcon, GraduationCapIcon, SproutIcon, UsersIcon, type LucideIcon } from "lucide-react"

const highlights: { icon: LucideIcon; title: string; description: string }[] = [
  {
    icon: GraduationCapIcon,
    title: "Quality Education",
    description: "Building a strong foundation for a brighter future.",
  },
  {
    icon: UsersIcon,
    title: "Dedicated Teachers",
    description: "Experienced teachers committed to every student's growth.",
  },
  {
    icon: SproutIcon,
    title: "Holistic Development",
    description: "Supporting academic, social and personal development.",
  },
  {
    icon: CrossIcon,
    title: "Christ-Centred Values",
    description: "Character, discipline and strong moral values.",
  },
]

/** Four compact highlights; overlaps the bottom edge of the hero. */
function Highlights() {
  return (
    <section aria-labelledby="highlights-heading" className="page-container relative z-10 -mt-12 md:-mt-16 lg:-mt-20">
      <h2 id="highlights-heading" className="sr-only">
        Why families choose Zion Baptist High School
      </h2>
      <ul className="grid gap-px overflow-hidden rounded-xl border border-border bg-border shadow-md sm:grid-cols-2 xl:grid-cols-4">
        {highlights.map(({ icon: Icon, title, description }) => (
          <li key={title} className="flex items-start gap-4 bg-card p-5 lg:p-6">
            <span className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-brand-100 text-primary">
              <Icon className="size-5" aria-hidden="true" />
            </span>
            <div className="flex flex-col gap-1">
              <h3 className="type-card-title text-foreground">{title}</h3>
              <p className="type-body-sm text-muted-foreground">{description}</p>
            </div>
          </li>
        ))}
      </ul>
    </section>
  )
}

export { Highlights }
