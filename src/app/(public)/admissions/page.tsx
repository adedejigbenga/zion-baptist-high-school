import type { Metadata } from "next"
import Link from "next/link"
import { ClipboardCheckIcon, FileTextIcon, GraduationCapIcon, MessageCircleQuestionIcon, SearchIcon } from "lucide-react"

import { CtaBand, Faq, Section, Steps, ToBeConfirmed } from "@/components/site/blocks"
import { PageHero } from "@/components/site/page-hero"
import { buttonVariants } from "@/components/ui/button"
import { pageMetadata } from "@/lib/seo"
import { siteConfig } from "@/lib/site-config"

export const metadata: Metadata = pageMetadata({
  title: "Admissions",
  description: "How to apply to Zion Baptist High School: the admissions journey from enquiry to enrolment, requirements and frequently asked questions.",
  path: "/admissions",
})

const journey = [
  { icon: MessageCircleQuestionIcon, title: "Enquiry", description: "Contact the school to ask questions and request admission information." },
  { icon: FileTextIcon, title: "Application", description: "Complete the application and submit the required documents." },
  { icon: SearchIcon, title: "Review", description: "The school reviews the application and may invite the student for an assessment or interview." },
  { icon: ClipboardCheckIcon, title: "Admission decision", description: "Families are told the outcome and what to do next." },
  { icon: GraduationCapIcon, title: "Enrolment", description: "Accepted students complete enrolment and receive their portal login details." },
]

// PLACEHOLDER answers: the school should confirm or replace each one.
const faqs = [
  { question: "Which classes do you admit into?", answer: "Please contact the school office to confirm which classes have places for the coming session." },
  { question: "When does the admission period open and close?", answer: "Admission dates are announced by the school each session. Use the contact page to ask for the current dates." },
  { question: "Is there an entrance assessment?", answer: "The school may ask applicants to complete an assessment or interview. The office will explain the arrangements when you apply." },
  { question: "What are the school fees?", answer: "Fee information is provided by the school office. Please enquire for the current fee schedule." },
  { question: "Does the school have a uniform?", answer: "Yes. Details of the uniform are given to families during enrolment." },
  { question: "How will I follow my child's progress?", answer: "Enrolled students receive portal access, where published results and announcements are available." },
]

export default function AdmissionsPage() {
  const { contact } = siteConfig
  return (
    <>
      <PageHero
        eyebrow="Admissions"
        title="Admissions are open"
        description="Give your child a strong foundation for academic success, character and purpose. Here is how joining Zion Baptist High School works."
        trail={[{ label: "Admissions" }]}
      >
        <Link href="#apply" className={buttonVariants({ variant: "inverse", size: "lg" })}>
          How to Apply
        </Link>
        <Link href="/contact?topic=admissions" className={buttonVariants({ variant: "outline", size: "lg", className: "border-white/60 bg-transparent text-white hover:border-white hover:bg-white/10 hover:text-white" })}>
          Make an Enquiry
        </Link>
      </PageHero>

      <Section id="apply" eyebrow="The admissions journey" title="From enquiry to enrolment" description="Five simple steps. The school office will guide you through each one.">
        <Steps steps={journey} />
      </Section>

      <Section id="requirements" tone="subtle" eyebrow="Requirements" title="What you will need">
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="flex flex-col gap-4 rounded-xl border border-brand-100 bg-card p-6">
            <h3 className="type-card-title text-foreground">Documents</h3>
            <ul className="list-disc space-y-2 pl-5 type-body-sm text-muted-foreground">
              <li>Completed application form</li>
              <li>Birth certificate or proof of age</li>
              <li>Previous school report or records</li>
              <li>Passport photographs</li>
            </ul>
            <ToBeConfirmed>Final document list to be confirmed by the school</ToBeConfirmed>
          </div>
          <div className="flex flex-col gap-4 rounded-xl border border-brand-100 bg-card p-6">
            <h3 className="type-card-title text-foreground">Key information</h3>
            <dl className="grid gap-4 sm:grid-cols-2">
              {["Admission dates", "Entrance assessment", "School fees", "Age and class placement"].map((label) => (
                <div key={label} className="flex flex-col gap-1.5">
                  <dt className="type-label text-foreground">{label}</dt>
                  <dd>
                    <ToBeConfirmed />
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </Section>

      <Section id="faq" eyebrow="Questions" title="Frequently asked questions">
        <div className="max-w-3xl">
          <Faq items={faqs} />
        </div>
      </Section>

      <Section id="enquiry" tone="subtle" eyebrow="Talk to us" title="Enquiry and contact" description="Our office can answer questions about places, fees and the application process.">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <Link href="/contact?topic=admissions" className={buttonVariants({ size: "lg" })}>
            Send an Enquiry
          </Link>
          <p className="type-body-sm text-muted-foreground">
            Or call <a className="text-primary underline underline-offset-4" href={`tel:${contact.phone.replace(/\s/g, "")}`}>{contact.phone}</a> or email{" "}
            <a className="break-all text-primary underline underline-offset-4" href={`mailto:${contact.email}`}>{contact.email}</a>.
          </p>
        </div>
      </Section>

      <CtaBand
        title="Admissions Are Open"
        description="Give your child a strong foundation for academic success, character and purpose."
        primary={{ label: "Enquire About Admissions", href: "/contact?topic=admissions" }}
        secondary={{ label: "Learn About Our School", href: "/about" }}
      />
    </>
  )
}
