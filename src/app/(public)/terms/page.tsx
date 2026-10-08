import type { Metadata } from "next"

import { LegalPage } from "@/components/site/legal-page"
import { pageMetadata } from "@/lib/seo"

export const metadata: Metadata = pageMetadata({
  title: "Terms & Conditions",
  description: "Terms for using the Zion Baptist High School website and portal.",
  path: "/terms",
})

export default function TermsPage() {
  return (
    <LegalPage
      title="Terms & Conditions"
      intro="The terms for using this website and the school portal."
      sections={[
        { heading: "Using the website", text: "The information on this website is provided for general guidance. The school may update it at any time." },
        { heading: "Portal accounts", text: "Portal accounts are personal. Keep your password private and tell the school at once if you think someone else knows it." },
        { heading: "Acceptable use", text: "Do not try to access records that are not yours, or to interfere with the website or portal." },
        { heading: "Changes", text: "The school may change these terms. Continued use of the website means you accept the updated terms." },
      ]}
    />
  )
}
