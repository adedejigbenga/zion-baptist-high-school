/** Shape of a news / events item as the public site renders it. Later produced by the data layer. */
export type NewsItem = {
  slug: string
  title: string
  excerpt: string
  category: string
  /** ISO date (YYYY-MM-DD). */
  date: string
  /** Real photo, when one exists. Falls back to the illustrated visual below. */
  image?: { src: string; alt: string }
  /** Which placeholder visual to show when there is no photo. */
  visual: "academics" | "students" | "community"
  /** Defaults to the news listing until individual news pages exist. */
  href?: string
}
