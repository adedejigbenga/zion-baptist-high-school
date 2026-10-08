import type { Metadata } from "next"
import { Suspense } from "react"
import { ClockIcon, MailIcon, MapIcon, MapPinIcon, PhoneIcon } from "lucide-react"

import { PageHero } from "@/components/site/page-hero"
import { ContactForm } from "@/components/site/contact-form"
import { Section } from "@/components/site/blocks"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { pageMetadata } from "@/lib/seo"
import { siteConfig } from "@/lib/site-config"
import { ENQUIRY_TOPICS } from "@/lib/validation/enquiry"

export const metadata: Metadata = pageMetadata({
  title: "Contact",
  description: "Contact Zion Baptist High School: address, phone, email, opening hours and an enquiry form.",
  path: "/contact",
})

type SearchParams = Promise<Record<string, string | string[] | undefined>>

export default function ContactPage({ searchParams }: { searchParams: SearchParams }) {
  return (
    <>
      <PageHero eyebrow="Contact" title="We would love to hear from you" description="Ask about admissions, visit arrangements or anything else. The school office will reply as soon as it can." trail={[{ label: "Contact" }]} />
      {/* The query string (?topic=) is request-time data, so this part streams in. */}
      <Suspense fallback={<ContactSkeleton />}>
        <ContactBody searchParams={searchParams} />
      </Suspense>
    </>
  )
}

function ContactSkeleton() {
  return (
    <div className="page-section">
      <div className="page-container grid gap-8 lg:grid-cols-[1fr_1.4fr]" role="status" aria-label="Loading contact details">
        <Skeleton className="h-80 rounded-xl" />
        <Skeleton className="h-96 rounded-xl" />
      </div>
    </div>
  )
}

async function ContactBody({ searchParams }: { searchParams: SearchParams }) {
  const { topic } = await searchParams
  const defaultTopic = ENQUIRY_TOPICS.some((t) => t.value === topic) ? (topic as string) : "general"
  const { contact } = siteConfig

  return (
    <>
      <Section id="contact" eyebrow="Get in touch" title="Contact the school office">
        <div className="grid gap-8 lg:grid-cols-[1fr_1.4fr] lg:gap-12">
          {/* PLACEHOLDER details: edit in src/lib/site-config.ts */}
          <div className="flex flex-col gap-5">
            <Card size="sm">
              <CardContent>
                <ul className="flex flex-col gap-5">
                  <li className="flex items-start gap-4">
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-secondary text-primary"><MapPinIcon className="size-5" aria-hidden="true" /></span>
                    <div>
                      <h3 className="type-label text-foreground">Address</h3>
                      <address className="mt-1 type-body-sm text-muted-foreground not-italic">
                        {contact.address.map((line) => <span key={line} className="block">{line}</span>)}
                      </address>
                    </div>
                  </li>
                  <li className="flex items-start gap-4">
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-secondary text-primary"><PhoneIcon className="size-5" aria-hidden="true" /></span>
                    <div>
                      <h3 className="type-label text-foreground">Phone</h3>
                      <a href={`tel:${contact.phone.replace(/\s/g, "")}`} className="mt-1 block type-body-sm text-muted-foreground hover:text-primary hover:underline underline-offset-4">{contact.phone}</a>
                    </div>
                  </li>
                  <li className="flex items-start gap-4">
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-secondary text-primary"><MailIcon className="size-5" aria-hidden="true" /></span>
                    <div className="min-w-0">
                      <h3 className="type-label text-foreground">Email</h3>
                      <a href={`mailto:${contact.email}`} className="mt-1 block break-all type-body-sm text-muted-foreground hover:text-primary hover:underline underline-offset-4">{contact.email}</a>
                    </div>
                  </li>
                  <li className="flex items-start gap-4">
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-secondary text-primary"><ClockIcon className="size-5" aria-hidden="true" /></span>
                    <div>
                      <h3 className="type-label text-foreground">Opening hours</h3>
                      <ul className="mt-1 type-body-sm text-muted-foreground">
                        {contact.hours.map((h) => <li key={h.days}>{h.days}: {h.time}</li>)}
                      </ul>
                    </div>
                  </li>
                </ul>
              </CardContent>
            </Card>

            <div role="img" aria-label="Map placeholder" className="flex aspect-[16/10] items-center justify-center rounded-xl border border-brand-100 bg-linear-to-br from-brand-100 to-brand-50">
              <div className="flex flex-col items-center gap-2 text-center" aria-hidden="true">
                <MapIcon className="size-8 text-primary" />
                <span className="type-caption text-brand-800">Map will be added here</span>
              </div>
            </div>
          </div>

          <Card>
            <CardContent className="flex flex-col gap-6">
              <div>
                <h2 className="type-section-title text-foreground">Send us a message</h2>
                <p className="mt-1 type-body-sm text-muted-foreground">We use your details only to reply to your enquiry.</p>
              </div>
              <ContactForm defaultTopic={defaultTopic} />
            </CardContent>
          </Card>
        </div>
      </Section>
    </>
  )
}
