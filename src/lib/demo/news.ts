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
  {
    slug: "inter-house-sports-preparations",
    title: "Preparations for Inter-House Sports",
    excerpt:
      "Students are training with their houses ahead of the sports programme, with teamwork and fair play at the centre.",
    category: "Sports",
    date: "2026-10-05",
    visual: "students",
  },
  {
    slug: "science-club-activities",
    title: "Science Club Activities",
    excerpt:
      "Members of the science club are working on simple experiments and projects that build curiosity and confidence.",
    category: "Academics",
    date: "2026-10-06",
    visual: "academics",
  },
  {
    slug: "parents-and-teachers-meeting",
    title: "Parents and Teachers Meeting",
    excerpt:
      "Families are invited to meet teachers, review progress and talk about how to support students at home.",
    category: "Events",
    date: "2026-10-08",
    visual: "community",
  },
]
