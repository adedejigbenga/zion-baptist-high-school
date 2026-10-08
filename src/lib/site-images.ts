/**
 * Every photograph slot on the public site, in one place.
 *
 * HOW TO REPLACE A PLACEHOLDER: copy the photo into /public/images (e.g. /public/images/library.jpg) and set the slot's
 * `src` below. Nothing else changes: <SchoolImage slot="library" /> shows the photo (with the `alt` text) instead of the
 * placeholder. Use landscape photos of at least 1600px wide; the site crops them to fit.
 *
 * Until then every slot shows a clearly labelled placeholder. No stock photos, other schools' images or logos are used.
 */

export type ImageSlot =
  | "hero"
  | "welcome"
  | "about"
  | "classrooms"
  | "laboratory"
  | "ict"
  | "library"
  | "sports"
  | "science"
  | "events"
  | "arts"
  | "activities"
  | "assembly"
  | "campus"

export type SlotConfig = {
  /** Public path of the photo, or null while the placeholder is shown. */
  src: string | null
  /** What the photo shows (used as alt text once it is real). */
  alt: string
  /** Short label printed on the placeholder. */
  label: string
}

export const siteImages: Record<ImageSlot, SlotConfig> = {
  hero: { src: null, alt: "Students and teachers on the Zion Baptist High School campus", label: "Campus photo" },
  welcome: { src: null, alt: "Zion Baptist High School students together in school uniform", label: "Students photo" },
  about: { src: null, alt: "The Zion Baptist High School community", label: "School community photo" },
  classrooms: { src: null, alt: "A classroom at Zion Baptist High School", label: "Classroom photo" },
  laboratory: { src: null, alt: "Students working in the science laboratory", label: "Science laboratory photo" },
  ict: { src: null, alt: "Students using computers in the ICT lab", label: "ICT lab photo" },
  library: { src: null, alt: "The school library", label: "Library photo" },
  sports: { src: null, alt: "Students taking part in sports", label: "Sports photo" },
  science: { src: null, alt: "Students doing a science activity", label: "Science activity photo" },
  events: { src: null, alt: "A school event", label: "School event photo" },
  arts: { src: null, alt: "Students in an arts and culture performance", label: "Arts & culture photo" },
  activities: { src: null, alt: "Students in a club or activity", label: "Student activity photo" },
  assembly: { src: null, alt: "Morning assembly", label: "Assembly photo" },
  campus: { src: null, alt: "The school grounds", label: "School grounds photo" },
}
