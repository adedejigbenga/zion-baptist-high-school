import Link from "next/link"
import { MailIcon, MapPinIcon, PhoneIcon } from "lucide-react"

import { BrandLogo } from "@/components/layout/brand-logo"
import { mainNav, portalLinks, siteConfig } from "@/lib/site-config"

const linkClass =
  "inline-flex min-h-8 items-center rounded-sm type-body-sm text-muted-foreground transition-colors hover:text-primary hover:underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring pointer-coarse:min-h-11"

function PublicFooter() {
  const { contact } = siteConfig

  return (
    <footer className="border-t border-border bg-surface-subtle">
      <div className="page-container grid gap-10 py-12 lg:py-16 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1.3fr] lg:gap-12">
        <div className="flex max-w-sm flex-col gap-4">
          <BrandLogo />
          <p className="type-body-sm text-muted-foreground">{siteConfig.description}</p>
        </div>

        <nav aria-labelledby="footer-links">
          <h2 id="footer-links" className="type-card-title mb-3 text-foreground">
            Quick Links
          </h2>
          <ul className="flex flex-col">
            {mainNav.map((item) => (
              <li key={item.href}>
                <Link href={item.href} className={linkClass}>
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <nav aria-labelledby="footer-portal">
          <h2 id="footer-portal" className="type-card-title mb-3 text-foreground">
            Portal
          </h2>
          <ul className="flex flex-col">
            {portalLinks.map((item) => (
              <li key={item.label}>
                <Link href={item.href} className={linkClass}>
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        {/* PLACEHOLDER contact details: edit in src/lib/site-config.ts */}
        <div>
          <h2 className="type-card-title mb-3 text-foreground">Contact</h2>
          <ul className="flex flex-col gap-3 type-body-sm text-muted-foreground">
            <li className="flex items-start gap-3">
              <MapPinIcon className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
              <address className="not-italic">
                {contact.address.map((line) => (
                  <span key={line} className="block">
                    {line}
                  </span>
                ))}
              </address>
            </li>
            <li className="flex items-center gap-3">
              <PhoneIcon className="size-4 shrink-0 text-primary" aria-hidden="true" />
              <a href={`tel:${contact.phone.replace(/\s/g, "")}`} className="hover:text-primary hover:underline underline-offset-4">
                {contact.phone}
              </a>
            </li>
            <li className="flex items-center gap-3">
              <MailIcon className="size-4 shrink-0 text-primary" aria-hidden="true" />
              <a href={`mailto:${contact.email}`} className="break-all hover:text-primary hover:underline underline-offset-4">
                {contact.email}
              </a>
            </li>
          </ul>
        </div>
      </div>

      <div className="border-t border-border">
        <div className="page-container py-5">
          <p className="type-caption font-normal text-muted-foreground">
            &copy; 2026 {siteConfig.name}. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  )
}

export { PublicFooter }
