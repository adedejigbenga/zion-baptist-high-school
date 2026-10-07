/**
 * Central place for school-wide public-site content.
 * Everything marked PLACEHOLDER must be replaced with real school information before launch.
 */

export const siteConfig = {
  name: "Zion Baptist High School",
  /** Two-line wordmark shown next to the logo mark. */
  wordmark: { line1: "ZION BAPTIST", line2: "HIGH SCHOOL" },
  tagline: "Knowledge • Character • Excellence",
  description:
    "Zion Baptist High School is a Christian secondary school committed to sound learning, good character and a caring school community.",

  /** Where "Visit the Portal" goes. The portal itself is built in a later step. */
  portalHref: "/portal",

  /**
   * Hero photograph. Set to a real campus photo (put the file in /public/images) and the
   * illustration placeholder is replaced automatically, e.g.
   * { src: "/images/campus.jpg", alt: "Students walking across the Zion Baptist High School campus" }
   */
  heroImage: null as { src: string; alt: string } | null,

  // PLACEHOLDER: replace with the school's real contact details.
  contact: {
    phone: "+234 800 000 0000",
    email: "info@zionbaptist.example",
    address: ["School Road", "Town, State", "Nigeria"],
  },
} as const

export type NavItem = { label: string; href: string }

/** Main public navigation. Pages other than "/" are built in later steps. */
export const mainNav: readonly NavItem[] = [
  { label: "Home", href: "/" },
  { label: "About Us", href: "/about" },
  { label: "Academics", href: "/academics" },
  { label: "Admissions", href: "/admissions" },
  { label: "News & Events", href: "/news" },
  { label: "Contact", href: "/contact" },
]

/** Portal entry points shown in the footer. Both lead to the portal entry page for now. */
export const portalLinks: readonly NavItem[] = [
  { label: "Student Portal", href: siteConfig.portalHref },
  { label: "Teacher Portal", href: siteConfig.portalHref },
]
