import { strengths } from "@/lib/public-content"

/** Floating card of five school strengths that overlaps the bottom of the hero. */
function Strengths() {
  return (
    <section aria-labelledby="strengths-heading" className="page-container relative z-10 -mt-24 md:-mt-28 lg:-mt-32">
      <h2 id="strengths-heading" className="sr-only">
        What sets our school apart
      </h2>
      <ul className="grid gap-px overflow-hidden rounded-2xl border border-border bg-border shadow-lg sm:grid-cols-2 lg:grid-cols-5">
        {strengths.map(({ icon: Icon, title, description }, index) => (
          <li key={title} className={`flex items-start gap-4 bg-card p-5 lg:flex-col lg:p-6 ${index === strengths.length - 1 ? "sm:max-lg:col-span-2" : ""}`}>
            <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-secondary text-primary">
              <Icon className="size-6" aria-hidden="true" />
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

export { Strengths }
