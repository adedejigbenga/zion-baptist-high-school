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

**Step 6 - Database schema.** The public homepage and a visual-only portal gateway are built on the design system ([DESIGN-SYSTEM.md](DESIGN-SYSTEM.md)). The Prisma database schema (21 models) is designed and validated ([ARCHITECTURE.md](ARCHITECTURE.md), section 6) but no database or migration exists yet. There is no real authentication. Hero image, logo mark, news items and contact details are temporary placeholders (see `src/lib/site-config.ts` and `src/lib/demo/`).

## Getting Started

```bash
npm install
cp .env.example .env.local   # then fill in real values
npm run dev
```

Open http://localhost:3000.



