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

**Step 4 - Public homepage.** The public school homepage is built on the design system ([DESIGN-SYSTEM.md](DESIGN-SYSTEM.md)); architecture is in [ARCHITECTURE.md](ARCHITECTURE.md). The hero image, logo mark, news items and contact details are temporary placeholders (see `src/lib/site-config.ts` and `src/lib/demo/`). Prisma is configured but has no models. The portal, authentication and database schema do not exist yet.

## Getting Started

```bash
npm install
cp .env.example .env.local   # then fill in real values
npm run dev
```

Open http://localhost:3000.



