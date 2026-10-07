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

**Step 8 - Authentication.** The public homepage, the portal gateway and a local PostgreSQL database (21-model Prisma schema, migrations, demo seed) are in place ([ARCHITECTURE.md](ARCHITECTURE.md), [DESIGN-SYSTEM.md](DESIGN-SYSTEM.md)). Students, teachers and administrators can now sign in and out with database-backed sessions; after signing in each role reaches a temporary landing page. The dashboards, result pages and any page that reads academic data are not built yet. Hero image, logo mark, news items and contact details are temporary placeholders (see `src/lib/site-config.ts` and `src/lib/demo/`).

## Local Database Setup

PostgreSQL is required for development (version 15 or newer; the project was set up with PostgreSQL 17).

1. **Install PostgreSQL** and make sure the server is running on `localhost:5432`
   (Windows: `winget install PostgreSQL.PostgreSQL.17`, or the installer from postgresql.org).
2. **Create a database and a user** (run as the PostgreSQL superuser, for example with `psql -U postgres`):

   ```sql
   CREATE ROLE zion_app LOGIN PASSWORD 'choose-a-password' CREATEDB;
   CREATE DATABASE zion_baptist_high_school OWNER zion_app;
   ```

   `CREATEDB` lets `prisma migrate dev` create its temporary shadow database.
3. **Configure `.env.local`** (git-ignored; never commit it). Copy `.env.example` and set:

   ```
   DATABASE_URL="postgresql://zion_app:choose-a-password@localhost:5432/zion_baptist_high_school"
   ```

   If the password contains special characters, URL-encode them.
4. **Apply the migrations:** `npm run db:migrate` (runs `prisma migrate dev`).
5. **Load the demo data:** `npm run db:seed` (runs `prisma db seed`). It is safe to run repeatedly.
6. **Reset the development database** (deletes all data, re-applies migrations): `npm run db:reset`, then `npm run db:seed`.
   Only ever do this on a local development database.

Other useful commands: `npx prisma migrate status`, `npx prisma studio`, `npx prisma generate` (after changing the schema).

The first migration (`init_school_portal`) also contains hand-written SQL for rules Prisma cannot express (single current
session/term/default scheme, score and weight checks, grade-band overlap). Keep that SQL if you ever recreate the migration.

### Demo accounts (DEVELOPMENT ONLY)

> **DEVELOPMENT ONLY.** These accounts exist only in the local seed data. All data is fictional. The password below is
> public and must never be used in any real or production environment. Passwords are stored as Argon2id hashes.

Shared demo password: `ZionDemo#2026`

| Role | Login ID | Notes |
|---|---|---|
| Admin | `admin.demo` | System Administrator |
| Teacher | `teacher.math` | Mathematics (JSS 1, JSS 2, SS 1, SS 2) |
| Teacher | `teacher.english` | English Language (JSS 1, JSS 2, SS 1, SS 2) |
| Teacher | `teacher.science` | Biology and Chemistry (SS 1, SS 2) |
| Student | `ZBHS/2026/001` Daniel Ade | JSS 1: **published** First Term result |
| Student | `ZBHS/2026/002` Grace Bello | JSS 1: result **submitted** (not yet published) |
| Student | `ZBHS/2026/003` Samuel James | JSS 2: result **draft** |
| Student | `ZBHS/2026/004` Esther Cole | SS 1: result **draft** |
| Student | `ZBHS/2026/005` David Peter | SS 1: no result yet |
| Student | `ZBHS/2026/006` Ruth Samuel | SS 3: no result yet |

Sign in at `/portal` (choose the portal that matches the account). After 5 wrong attempts for one Login ID within 15 minutes
further attempts are blocked for the rest of that window; to clear it while developing, run
`DELETE FROM "AuditLog" WHERE action LIKE 'AUTH_%';` against the development database.

## Running the Tests

```bash
npm test            # unit + database tests (vitest)
npm run test:watch  # re-run on change
```

Database tests use a separate `zion_baptist_high_school_test` database. It is created and migrated automatically the
first time (the `zion_app` role needs `CREATEDB`), and the test helpers refuse to run against any database whose name
does not end in `_test`, so the development data is never touched.

## Getting Started

```bash
npm install
cp .env.example .env.local   # then fill in real values (see Local Database Setup)
npm run db:migrate && npm run db:seed
npm run dev
```

Open http://localhost:3000.



