/**
 * Every image slot on the public site, in one place.
 *
 * Right now each slot shows an original ILLUSTRATION (public/images/<slot>.svg, drawn by scripts/generate-illustrations.mjs
 * in the school's purple palette). They are stand-ins: no stock photos, other schools' images or logos are used.
 *
 * HOW TO USE A REAL PHOTO: copy it into /public/images (e.g. /public/images/library.jpg), then change that slot's `src` and
 * `alt` below. Nothing else changes. Use landscape photos at least 1600px wide; the site crops them to fit. Setting `src`
 * to null shows the plain labelled placeholder instead.
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
  hero: { src: "/images/hero.svg", alt: "Illustration of the school building with students walking up the path", label: "Campus photo" },
  welcome: { src: "/images/welcome.svg", alt: "Illustration of Zion Baptist High School students standing together in school uniform", label: "Students photo" },
  about: { src: "/images/about.svg", alt: "Illustration of teachers and students at the school gate", label: "School community photo" },
  classrooms: { src: "/images/classrooms.svg", alt: "Illustration of a teacher at the board with students at their desks", label: "Classroom photo" },
  laboratory: { src: "/images/laboratory.svg", alt: "Illustration of two students in lab coats at a science bench", label: "Science laboratory photo" },
  ict: { src: "/images/ict.svg", alt: "Illustration of students working at computers in the ICT lab", label: "ICT lab photo" },
  library: { src: "/images/library.svg", alt: "Illustration of two students reading at a table between full bookshelves", label: "Library photo" },
  sports: { src: "/images/sports.svg", alt: "Illustration of students playing football on a school field", label: "Sports photo" },
  science: { src: "/images/science.svg", alt: "Illustration of students at a science fair table with a model volcano", label: "Science activity photo" },
  events: { src: "/images/events.svg", alt: "Illustration of students on a stage at a school event with an audience", label: "School event photo" },
  arts: { src: "/images/arts.svg", alt: "Illustration of students painting and playing a drum in an arts class", label: "Arts & culture photo" },
  activities: { src: "/images/activities.svg", alt: "Illustration of students playing chess and reading together at a club", label: "Student activity photo" },
  assembly: { src: "/images/assembly.svg", alt: "Illustration of students lined up in rows for morning assembly", label: "Assembly photo" },
  campus: { src: "/images/campus.svg", alt: "Illustration of the school grounds with trees, a bench and students walking", label: "School grounds photo" },
}
