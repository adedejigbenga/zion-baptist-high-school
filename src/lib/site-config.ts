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

  /** The school's time zone: used for greetings ("Good morning") and for showing dates, whatever the server's clock says. */
  timeZone: "Africa/Lagos",

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
    /** One line for the slim top bar. */
    location: "Town, State, Nigeria",
    // PLACEHOLDER opening hours.
    hours: [
      { days: "Monday - Friday", time: "8:00 AM - 4:00 PM" },
      { days: "Saturday - Sunday", time: "Closed" },
    ],
  },

  /** Social profiles. Leave null until the school has real accounts: icons without a link are shown as "coming soon". */
  social: {
    facebook: null as string | null,
    instagram: null as string | null,
    youtube: null as string | null,
    x: null as string | null,
  },

  /**
   * False until the contact form is connected to email or a database (see src/lib/services/enquiry.ts).
   * While false, the form says plainly that delivery is not connected yet.
   */
  enquiryDeliveryConnected: false,
} as const

export type NavItem = { label: string; href: string }

/** Main public navigation. The Portal is a separate button (see PublicHeader). */
export const mainNav: readonly NavItem[] = [
  { label: "Home", href: "/" },
  { label: "About Us", href: "/about" },
  { label: "Academics", href: "/academics" },
  { label: "Facilities", href: "/facilities" },
  { label: "Admissions", href: "/admissions" },
  { label: "Student Life", href: "/student-life" },
  { label: "News & Events", href: "/news" },
  { label: "Contact", href: "/contact" },
]

/** Links on the right of the slim top bar. */
export const topBarLinks: readonly NavItem[] = [
  { label: "News & Events", href: "/news" },
  { label: "Alumni", href: "/student-life#alumni" },
  { label: "Parent / Student Login", href: siteConfig.portalHref },
]

/** Portal entry points shown in the footer. Both lead to the portal entry page for now. */
export const portalLinks: readonly NavItem[] = [
  { label: "Student Portal", href: "/portal/student/login" },
  { label: "Teacher Portal", href: "/portal/teacher/login" },
  { label: "Portal Home", href: siteConfig.portalHref },
]
