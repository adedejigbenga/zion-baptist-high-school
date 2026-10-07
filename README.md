# Zion Baptist High School

A web application for Zion Baptist High School.

## Purpose

- Public school website
- Student, teacher and admin portals
- Authentication and role-based access
- Student academic records and results management

## Technology Stack

- Next.js (App Router) + TypeScript
- Tailwind CSS
- shadcn/ui
- PostgreSQL (hosted separately) + Prisma ORM
- Zod for validation
- Git for version control
- Deployment target: Vercel

## Current Development Stage

**Step 3 - Design system.** The foundation and architecture ([ARCHITECTURE.md](ARCHITECTURE.md)) are in place, and the visual design system ([DESIGN-SYSTEM.md](DESIGN-SYSTEM.md)) is established: colour/typography/spacing tokens and base UI components. Prisma is configured but has no models. No pages, authentication or database schema exist yet.

## Getting Started

```bash
npm install
cp .env.example .env.local   # then fill in real values
npm run dev
```

Open http://localhost:3000.


