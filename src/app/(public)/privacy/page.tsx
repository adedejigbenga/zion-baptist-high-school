import type { Metadata } from "next"

import { LegalPage } from "@/components/site/legal-page"
import { pageMetadata } from "@/lib/seo"

export const metadata: Metadata = pageMetadata({
  title: "Privacy Policy",
  description: "How Zion Baptist High School handles personal information.",
  path: "/privacy",
})

export default function PrivacyPage() {
  return (
    <LegalPage
      title="Privacy Policy"
      intro="How the school handles personal information on this website and in the school portal."
      sections={[
        { heading: "Information we collect", text: "Details you give us through the contact form, and the account details the school holds for students, parents and staff who use the portal." },
        { heading: "How we use it", text: "To reply to enquiries, to run the school portal and to keep student records accurate. We do not sell personal information." },
        { heading: "Keeping it safe", text: "Portal passwords are stored in protected form, and access to student records is limited to the people who need it." },
        { heading: "Contact", text: "Questions about privacy can be sent to the school office using the details on the contact page." },
      ]}
    />
  )
}
