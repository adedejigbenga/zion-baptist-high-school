import { PageHero } from "@/components/site/page-hero"
import { ToBeConfirmed } from "@/components/site/blocks"

/** Placeholder frame for the Privacy Policy and Terms pages: the school must supply the real text. */
function LegalPage({ title, intro, sections }: { title: string; intro: string; sections: { heading: string; text: string }[] }) {
  return (
    <>
      <PageHero title={title} description={intro} trail={[{ label: title }]} />
      <section className="page-section">
        <div className="page-container flex max-w-3xl flex-col gap-8">
          <ToBeConfirmed>Draft wording: the school must supply its final {title.toLowerCase()}</ToBeConfirmed>
          {sections.map((s) => (
            <div key={s.heading} className="flex flex-col gap-2">
              <h2 className="type-section-title text-foreground">{s.heading}</h2>
              <p className="type-body text-pretty text-muted-foreground">{s.text}</p>
            </div>
          ))}
        </div>
      </section>
    </>
  )
}

export { LegalPage }
