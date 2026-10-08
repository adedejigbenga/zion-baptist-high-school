import Link from "next/link"
import { ClockIcon, MailIcon, MapPinIcon, PhoneIcon, SendIcon } from "lucide-react"

import { BrandLogo } from "@/components/layout/brand-logo"
import { SocialLinks } from "@/components/site/social-links"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { portalLinks, siteConfig, type NavItem } from "@/lib/site-config"

const linkClass =
  "inline-flex min-h-8 items-center rounded-sm type-body-sm text-brand-100 transition-colors hover:text-white hover:underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white pointer-coarse:min-h-11"

const quickLinks: NavItem[] = [
  { label: "Home", href: "/" },
  { label: "About Us", href: "/about" },
  { label: "Facilities", href: "/facilities" },
  { label: "Student Life", href: "/student-life" },
  { label: "News & Events", href: "/news" },
  { label: "Contact", href: "/contact" },
]

const academicLinks: NavItem[] = [
  { label: "Academics", href: "/academics" },
  { label: "Admissions", href: "/admissions" },
  { label: "How to Apply", href: "/admissions#apply" },
  { label: "Admissions FAQ", href: "/admissions#faq" },
]

function LinkList({ id, title, items }: { id: string; title: string; items: readonly NavItem[] }) {
  return (
    <nav aria-labelledby={id}>
      <h2 id={id} className="type-card-title mb-3 text-white">
        {title}
      </h2>
      <ul className="flex flex-col">
        {items.map((item) => (
          <li key={item.label}>
            <Link href={item.href} className={linkClass}>
              {item.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  )
}

function PublicFooter() {
  const { contact } = siteConfig

  return (
    <footer className="bg-brand-950 text-brand-100">
      <div className="page-container grid gap-10 py-12 sm:grid-cols-2 lg:grid-cols-4 lg:py-16 xl:grid-cols-[1.5fr_0.8fr_0.8fr_1.2fr_1.4fr] xl:gap-10">
        <div className="flex max-w-sm flex-col gap-4 sm:col-span-2 lg:col-span-4 xl:col-span-1">
          <BrandLogo tone="inverse" />
          <p className="type-body-sm text-brand-200">{siteConfig.description}</p>
          <SocialLinks />
        </div>

        <LinkList id="footer-quick" title="Quick Links" items={quickLinks} />
        <div className="flex flex-col gap-8">
          <LinkList id="footer-academics" title="Academics & Admissions" items={academicLinks} />
        </div>
        <LinkList id="footer-portal" title="Portal" items={portalLinks} />

        {/* PLACEHOLDER contact details: edit in src/lib/site-config.ts */}
        <div className="flex flex-col gap-6 sm:col-span-2 lg:col-span-4 xl:col-span-1">
          <div>
            <h2 className="type-card-title mb-3 text-white">Contact</h2>
            <ul className="flex flex-col gap-3 type-body-sm text-brand-100">
              <li className="flex items-start gap-3">
                <MapPinIcon className="mt-0.5 size-4 shrink-0 text-brand-300" aria-hidden="true" />
                <address className="not-italic">
                  {contact.address.map((line) => (
                    <span key={line} className="block">
                      {line}
                    </span>
                  ))}
                </address>
              </li>
              <li className="flex items-center gap-3">
                <PhoneIcon className="size-4 shrink-0 text-brand-300" aria-hidden="true" />
                <a href={`tel:${contact.phone.replace(/\s/g, "")}`} className="hover:text-white hover:underline underline-offset-4">
                  {contact.phone}
                </a>
              </li>
              <li className="flex items-center gap-3">
                <MailIcon className="size-4 shrink-0 text-brand-300" aria-hidden="true" />
                <a href={`mailto:${contact.email}`} className="break-all hover:text-white hover:underline underline-offset-4">
                  {contact.email}
                </a>
              </li>
              <li className="flex items-start gap-3">
                <ClockIcon className="mt-0.5 size-4 shrink-0 text-brand-300" aria-hidden="true" />
                <span>
                  {contact.hours[0].days}: {contact.hours[0].time}
                </span>
              </li>
            </ul>
          </div>

          {/* Newsletter: not connected to anything yet, so the controls are disabled rather than pretending to work. */}
          <div>
            <h2 className="type-card-title mb-2 text-white">Newsletter</h2>
            <p className="mb-3 type-body-sm text-brand-200">Updates and events by email. Sign-up is coming soon.</p>
            <form className="flex gap-2" aria-label="Newsletter sign-up (coming soon)">
              <Label htmlFor="footer-newsletter" className="sr-only">
                Your email address
              </Label>
              <Input id="footer-newsletter" type="email" placeholder="Your email" disabled className="border-white/25 bg-white/10 text-white placeholder:text-brand-300" />
              <button type="button" disabled aria-label="Subscribe (coming soon)" className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-brand-200 text-brand-950 opacity-60 md:size-10">
                <SendIcon className="size-4" aria-hidden="true" />
              </button>
            </form>
          </div>
        </div>
      </div>

      <div className="border-t border-white/15">
        <div className="page-container flex flex-col gap-3 py-5 sm:flex-row sm:items-center sm:justify-between">
          <p className="type-caption font-normal text-brand-200">&copy; 2026 {siteConfig.name}. All rights reserved.</p>
          <ul className="flex items-center gap-5">
            <li>
              <Link href="/privacy" className={linkClass}>
                Privacy Policy
              </Link>
            </li>
            <li>
              <Link href="/terms" className={linkClass}>
                Terms &amp; Conditions
              </Link>
            </li>
          </ul>
        </div>
      </div>
    </footer>
  )
}

export { PublicFooter }
