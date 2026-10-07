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

**Step 2 - Architecture planning.** The project foundation is in place and the architecture is documented in [ARCHITECTURE.md](ARCHITECTURE.md). Prisma is configured (`prisma.config.ts`, `prisma/schema.prisma`) but contains no models yet. No pages, authentication or database schema exist yet.

## Getting Started

```bash
npm install
cp .env.example .env.local   # then fill in real values
npm run dev
```

Open http://localhost:3000.

