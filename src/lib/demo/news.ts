import type { NewsItem } from "@/types/news"

/**
 * TEMPORARY demo content for the homepage news section.
 * Replace with a data-layer call (published announcements) when the database exists;
 * <NewsSection items={...} /> already takes plain NewsItem[].
 */
export const demoNews: NewsItem[] = [
  {
    slug: "first-term-academic-activities",
    title: "First Term Academic Activities",
    excerpt:
      "Lessons are under way for the new term. Here is what students and parents can expect over the coming weeks.",
    category: "Academics",
    date: "2026-09-14",
    visual: "academics",
  },
  {
    slug: "student-orientation-programme",
    title: "Student Orientation Programme",
    excerpt:
      "New students were welcomed to the school and introduced to our teachers, routines and expectations.",
    category: "Students",
    date: "2026-09-21",
    visual: "students",
  },
  {
    slug: "school-community-and-special-events",
    title: "School Community & Special Events",
    excerpt:
      "From assemblies to special programmes, see how our school community comes together during the term.",
    category: "Events",
    date: "2026-10-02",
    visual: "community",
  },
]
