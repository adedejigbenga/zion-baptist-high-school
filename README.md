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

**Step 5 - Portal gateway (UI prototype).** The public homepage and a visual-only portal gateway (`/portal`, with prototype sign-in screens for students, teachers and admins) are built on the design system ([DESIGN-SYSTEM.md](DESIGN-SYSTEM.md)); architecture is in [ARCHITECTURE.md](ARCHITECTURE.md). There is no real authentication yet. Hero image, logo mark, news items and contact details are temporary placeholders (see `src/lib/site-config.ts` and `src/lib/demo/`). Prisma is configured but has no models.

## Getting Started

```bash
npm install
cp .env.example .env.local   # then fill in real values
npm run dev
```

Open http://localhost:3000.



