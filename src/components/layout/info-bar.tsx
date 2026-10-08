import Link from "next/link"
import { MailIcon, MapPinIcon, PhoneIcon } from "lucide-react"

import { siteConfig, topBarLinks } from "@/lib/site-config"

const linkClass =
  "inline-flex min-h-8 items-center rounded-sm hover:text-white hover:underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"

/**
 * Slim information bar above the header: contact details on the left, quick links and the admissions call to action on the
 * right. Contact details come from siteConfig (placeholders until the school supplies the real ones).
 */
function InfoBar() {
  const { contact } = siteConfig
  return (
    <div className="bg-brand-950 text-brand-100">
      <div className="page-container flex min-h-10 items-center justify-between gap-4 type-caption font-normal">
        <ul className="flex min-w-0 items-center gap-5">
          <li className="flex items-center gap-1.5">
            <PhoneIcon className="size-3.5 shrink-0 text-brand-300" aria-hidden="true" />
            <a href={`tel:${contact.phone.replace(/\s/g, "")}`} className={linkClass}>
              {contact.phone}
            </a>
          </li>
          <li className="hidden items-center gap-1.5 lg:flex">
            <MailIcon className="size-3.5 shrink-0 text-brand-300" aria-hidden="true" />
            <a href={`mailto:${contact.email}`} className={linkClass}>
              {contact.email}
            </a>
          </li>
          <li className="hidden items-center gap-1.5 md:flex">
            <MapPinIcon className="size-3.5 shrink-0 text-brand-300" aria-hidden="true" />
            <span>{contact.location}</span>
          </li>
        </ul>

        <div className="flex shrink-0 items-center gap-5">
          <ul className="hidden items-center gap-5 xl:flex">
            {topBarLinks.map((item) => (
              <li key={item.label}>
                <Link href={item.href} className={linkClass}>
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
          <Link
            href="/admissions"
            className="inline-flex min-h-8 items-center rounded-full bg-brand-200 px-3.5 type-caption font-semibold text-brand-950 transition-colors hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
          >
            Admissions Open
          </Link>
        </div>
      </div>
    </div>
  )
}

export { InfoBar }
