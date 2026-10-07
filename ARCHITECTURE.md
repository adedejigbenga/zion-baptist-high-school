# Zion Baptist High School - Architecture

> Status: **planning document.** Nothing described here as "future" is implemented yet.
> The Prisma schema is intentionally empty (no models). The conceptual model in section 6 is a proposal to be
> reviewed before it becomes the real schema.

Stack: Next.js 16 (App Router, Cache Components enabled), TypeScript, Tailwind CSS 4, shadcn/ui,
PostgreSQL + Prisma 7.10, Zod 4. Deployment target: Vercel, with PostgreSQL hosted separately.

> **Next.js 16 note.** This version differs from older Next.js. `middleware.ts` is now `proxy.ts` (Node.js runtime),
> and `cacheComponents: true` is on in `next.config.ts`, which changes how request-time data (cookies, sessions)
> must be read (behind `<Suspense>`). Read the guides in `node_modules/next/dist/docs/` before implementing
> authentication or data fetching.

---

## 1. Overall application architecture

One Next.js application, one codebase, one deployment, serving two audiences:

| Area | Audience | Rendering | Auth |
|---|---|---|---|
| Public website (`/`, `/about`, ...) | Anyone | Static / cached as much as possible | None |
| Portal (`/portal/...`) | Students, teachers, admins | Dynamic, per-request (session read) | Required |

```
Browser
  |
  v
proxy.ts            -> cheap, optimistic redirect only (is there a session cookie? is the path /portal/**?)
  |
  v
app/ (Server Components, Server Actions, Route Handlers)
  |   - validate input (Zod)
  |   - get current user (auth)          <- authentication: "who are you?"
  |   - check permission (policies)      <- authorization:  "may you do this to this record?"
  v
lib/dal + lib/services  (the ONLY code that talks to the database)
  |
  v
Prisma Client -> PostgreSQL (hosted separately)
```

Why a single app: shared components and design system, one deployment, no cross-origin cookie/CORS problems,
and the public site can show announcements from the same database. The public site and the portal are separated
by **route groups and layouts**, not by separate projects. If the portal ever needs to scale or be owned
separately, `/portal` is already an isolated subtree that can be extracted.

Two principles drive everything else:

1. **The server is the only trust boundary.** The browser is untrusted. Hiding a button is cosmetics, not security.
2. **All data access goes through one Data Access Layer (DAL)** that performs the authorization check and returns
   minimal DTOs. Pages never query Prisma directly. This is the pattern Next.js recommends for new projects
   (see `node_modules/next/dist/docs/01-app/02-guides/data-security.md`).

---

## 2. Route architecture

Route groups `(name)` organise code without affecting URLs.

```
/                              Home                              public
/about                         About the school                  public
/academics                     Academics                         public
/admissions                    Admissions                        public
/contact                       Contact                           public
/news  (later)                 Announcements shown publicly      public

/portal                        Portal entry ("Visit the Portal"): redirects by role, or to login
/portal/login                  Sign in                           public (guests only)
/portal/register  (later)      Student / teacher registration    public (guests only)
/portal/forgot-password (later)

/portal/student                Student dashboard                 STUDENT
/portal/student/results        List of terms with published results         STUDENT
/portal/student/results/[termId]   One term's result (or "Result Upload in Progress")   STUDENT

/portal/teacher                Teacher dashboard                 TEACHER
/portal/teacher/results        Result entry home (session -> term -> class -> student)   TEACHER
/portal/teacher/results/[resultId]   Enter/edit subject scores for one student          TEACHER (assigned only)

/portal/admin                  Admin dashboard                   ADMIN
/portal/admin/users            Approve / suspend accounts        ADMIN
/portal/admin/academics        Sessions, terms, classes, subjects, grading  ADMIN
/portal/admin/results          Review and publish results        ADMIN
/portal/admin/announcements    Manage announcements              ADMIN
```

**Improvements over the first sketch**

- Student/teacher/admin live under one `/portal` prefix, so `proxy.ts` can protect the whole prefix with a single
  matcher and the public site is untouched.
- Result pages take a `termId` (and the signed-in student is implied by the session). **A student ID is never part
  of a student-facing URL or form**, which removes the whole "change the ID in the URL" attack class.
- The admin area does not share a layout with the teacher/student areas; each role has its own layout and shell.

**Folder layout for routes**

```
src/app/
  layout.tsx                    root layout (html, fonts, global styles only)
  globals.css
  (public)/                     public website; has its own layout (header/footer)
    page.tsx                    "/"
    about/  academics/  admissions/  contact/
  portal/
    layout.tsx                  portal shell, no data access
    page.tsx                    "/portal" role-based redirect
    (auth)/                     login, register, forgot password (guests only)
    (protected)/
      student/                  STUDENT only
      teacher/                  TEACHER only
      admin/                    ADMIN only
  api/                          Route Handlers only if genuinely needed (webhooks, PDF, cron)
```

> The scaffolded `src/app/page.tsx` is still the default Next.js page. It will move to
> `src/app/(public)/page.tsx` when the public site is built.

**Layouts are not a security boundary.** In the App Router, layouts do not re-render on every navigation, so a
role check in a layout can be skipped. Every page, Server Action and Route Handler re-verifies the session and role
itself, via the DAL.

---

## 3. Application boundaries

```
src/
  app/            ROUTING + COMPOSITION. Pages, layouts, loading/error states, Server Actions files, route handlers.
                  Thin: read params, call a DAL/service function, render components. No SQL/Prisma, no business rules.
  components/
    ui/           shadcn/ui primitives (generated; treat as vendored).
    layout/       Shared shells: header, footer, portal sidebar.
    <feature>/    Feature components (e.g. results/, announcements/). Presentational; receive DTOs as props.
  lib/
    auth/         Session creation/reading, password hashing, current-user helper, role guards, policies (can()).
    dal/          Data Access Layer: server-only functions that authorize AND query. Return DTOs.
    services/     Multi-step business operations (publish results, promote students, compute totals/grades).
    validation/   Zod schemas, one per input. Source of truth for input types.
    db.ts         The single Prisma Client instance (server-only).
    constants.ts  Roles, route paths, other non-DB constants.
    utils.ts      Pure helpers (shadcn's cn(), formatting). Safe on client and server.
  types/          Shared TypeScript types that are NOT already derived from Prisma or Zod (DTOs, session shape).
  generated/      Prisma Client output (git-ignored, regenerated by `prisma generate`).
  proxy.ts        (later) optimistic route gating only.
public/           Static assets served as-is: logo, images, favicon, robots. No secrets, no uploads of private data.
prisma/           schema.prisma, migrations/, seed script. Never imported by app code.
prisma.config.ts  Prisma 7 CLI configuration (schema path, migrations path, datasource URL).
```

Rules of thumb:

- `lib/dal`, `lib/services`, `lib/auth`, `lib/db.ts` start with `import "server-only"` so that importing them
  from a Client Component fails the build. (Verify the `server-only` import resolves in this Next.js version when first used.)
- `lib/validation` and `lib/utils.ts` are environment-neutral: client forms and server actions share the same Zod
  schema, so the rules cannot drift.
- Anything under `components/` that needs state, effects or event handlers is a Client Component and must only
  receive already-authorized DTOs, never Prisma rows.
- Business rules (grade calculation, "can this result be edited?") live in `lib/services` / `lib/auth/policies`,
  **never** inside a page or component, so they are testable and reused.

---

## 4. Authentication architecture (future, not implemented)

**Goal:** establish *who the user is*, securely, on the server.

**Solution: not yet selected.** `AUTH_SECRET` in `.env.example` points at Auth.js (NextAuth v5) by convention, but
the choice is open and should be made at the start of the authentication step. Decision criteria:

| Option | Fit | Concern |
|---|---|---|
| Auth.js (NextAuth v5) Credentials | Familiar, large ecosystem | Credentials provider forces JWT sessions; instantly revoking a suspended teacher is harder; email/password flows (reset, verification) are mostly DIY. |
| Better Auth | Email/password, DB sessions and Prisma adapter built in | Newer library; confirm maturity and Next.js 16 / Cache Components compatibility. |
| Small custom DB-session layer (hashed password + opaque session token cookie, as in the Next.js authentication guide) | Fewest dependencies, full control, instant revocation | More security-sensitive code to write and own. |

**Recommendation:** use **database-backed sessions** (opaque random token in an `HttpOnly` cookie, hash of the token
stored in a `Session` table) with either Better Auth or the small custom layer. This allows immediate revocation when
an admin suspends an account or a user changes their password. Final choice to be confirmed before implementation.

**Intended flow**

1. **Registration** (students and teachers): creates a `User` with `status = PENDING`. The role is determined by
   *which registration form was used on the server*, never by a client-supplied field. Student registration
   additionally requires an admission number that links to an existing student record created by an admin; a
   registration alone grants no access to any academic data.
2. **Approval:** an admin approves (`ACTIVE`) or rejects. Only `ACTIVE` users can sign in. `ADMIN` accounts are
   never self-registered: the first is created by a seed/CLI step, later ones by existing admins.
3. **Login:** Zod-validate, look up user, verify password hash (constant-time), reject non-`ACTIVE`, rate-limit,
   create a session, set the cookie (`HttpOnly`, `Secure`, `SameSite=Lax`, scoped `Path=/`), redirect by role.
4. **Per request:** `getCurrentUser()` reads the cookie, validates the session against the DB (expiry, revoked,
   user still `ACTIVE`) and returns a **narrow** object (`id`, `role`, profile id) - never the password hash.
5. **Logout / password change:** delete the session row(s); changing the password revokes all other sessions.
6. **`proxy.ts`:** only an optimistic check ("session cookie present?") to redirect guests away from `/portal/**`
   quickly. It does **not** hit the database and is **not** the security check.

**Cache Components note:** reading the session reads cookies at request time, so any component that calls
`getCurrentUser()` sits behind `<Suspense>`, and session reads are kept out of the top level of layouts (see
`node_modules/next/dist/docs/01-app/02-guides/authentication-with-cache-components.md`). Portal pages that depend on a
session are therefore dynamic; the public site stays static.

---

## 5. Authorization architecture (future, not implemented)

Authentication answers "who?"; authorization answers "may this person do this to this record?". They are kept in
separate modules (`lib/auth/session` vs `lib/auth/policies`).

### Layers (defence in depth)

1. **`proxy.ts`** - optimistic redirect for UX. Not trusted.
2. **Page / layout guard** - `requireRole("STUDENT")` etc. at the top of each protected page for a clear redirect. Not
   sufficient alone (layouts don't re-run on navigation).
3. **DAL / service functions - the real enforcement.** Every function takes no trusted identity from the caller; it
   derives the user from the session itself and applies the policy before touching data.
4. **Server Actions and Route Handlers** - treat as public HTTP endpoints. Each one re-authenticates, re-authorizes,
   and validates its input with Zod.
5. **Database constraints** - uniqueness and foreign keys as a last line of defence against inconsistent data.

### Permission matrix (initial)

| Capability | STUDENT | TEACHER | ADMIN |
|---|---|---|---|
| View own profile | yes | yes | yes |
| View own **published** results | yes | - | - |
| View any student's results | **no** | only students in an assigned class, only for assigned subjects | yes |
| Create / edit draft result entries | no | only for (class, subject, session) they are assigned to, only while result is editable | yes (audited) |
| Submit results for review | no | yes, for their assigned entries | yes |
| Publish / unpublish results | no | **no** | yes |
| Edit a published result | no | no | only by unpublishing first (audited) |
| Manage sessions, terms, classes, subjects, grading | no | no | yes |
| Approve / suspend users, assign teachers | no | no | yes |
| Create announcements | no | later (own class only) | yes |

### How it is enforced

- Ownership is **derived from the session, not from input.** Student result query is conceptually
  `WHERE studentId = <student id from session> AND termId = <param> AND status = PUBLISHED`. There is no way to pass
  another student's ID because the function does not accept one.
- Teacher scope comes from a `TeacherAssignment` table (teacher + class + subject + session). A write is allowed only
  if a matching assignment exists, checked in the same DB transaction as the write.
- Policies are plain functions in one place, e.g. `can(user, "result:publish")`, `canEditResult(user, result)`, so a
  rule is written once and used by pages, actions and tests.
- Unauthorized access to a *specific record* returns **404, not 403**, so existence of other students' records isn't
  revealed. A wrong *role* on a route returns a redirect/403.
- **Never trust client role information.** The role comes from the server-side session lookup on each request, never
  from a cookie value the browser can edit, a hidden form field, a URL, or a JWT claim that isn't re-checked against
  user status.

---

## 6. Database planning (conceptual - not the final schema)

Conventions: string IDs (cuid/uuid), `createdAt`/`updatedAt` on every table, enums for closed sets, and **no
hard-coded academic values** (sessions, terms, classes and subjects are rows).

### 6.1 Relationship diagram

```
User 1---0..1 Student          User 1---0..1 Teacher          User 1---0..1 Admin
 |                              |
 |                              +--< TeacherAssignment >-- (Class, Subject, AcademicSession)
 +--< Session (login)
 +--< AuditLog (as actor)

AcademicSession 1---< Term                        (e.g. 2026/2027 -> First/Second/Third Term)
AcademicSession 1---< StudentEnrollment >---1 Class        (which class a student is in, per session)
Student        1---< StudentEnrollment
Class >---< Subject   (via ClassSubject: which subjects a class takes)

Result   = one student's report for one term   (Student x Term x Class)
Student 1---< Result >---1 Term
Result  1---< ResultEntry >---1 Subject         (one row per subject)
ResultEntry 1---< ResultEntryScore >---1 AssessmentComponent   (CA, Exam, ... configurable)
Result  1---< ResultPublication                 (append-only publish/unpublish history)
GradingScheme 1---< AssessmentComponent
GradingScheme 1---< GradeBand                   (e.g. 70-100 = A)
Result >---1 GradingScheme                      (snapshot of which scheme produced this result)

Announcement >---1 User (author);  optional target Class
AuditLog: actor User, action, entity, entityId, metadata
```

### 6.2 Models

**User** - the login identity, shared by all roles.
- Fields: `id`, `email` (unique, lowercased), `passwordHash`, `role` (STUDENT | TEACHER | ADMIN), `status`
  (PENDING | ACTIVE | SUSPENDED | REJECTED), `firstName`, `lastName`, `lastLoginAt`.
- Relations: optional 1:1 to exactly one of Student / Teacher / Admin; has many sessions.
- Constraints: unique email; `role` must match the profile that exists (enforced in a service, checked in tests).
  Exact auth tables (`Session`, `Account`, `VerificationToken`) depend on the chosen auth library.

**Student** - profile and academic identity.
- Fields: `id`, `userId` (unique, nullable until the student registers), `admissionNumber` (unique), `dateOfBirth`,
  `gender`, guardian contact, `status` (ACTIVE | GRADUATED | WITHDRAWN).
- Relations: enrollments, results.
- Constraints: unique admission number. The student record can exist **before** an account does (admin-created),
  and registration links to it.

**Teacher** - staff profile.
- Fields: `id`, `userId` (unique), `staffNumber` (unique), `phone`, `status`.
- Relations: teaching assignments.

**Admin** - admin profile.
- Fields: `id`, `userId` (unique), `title`. A future `permissions`/sub-role field can allow limited admins (e.g.
  "exams officer") without touching the role enum.

**AcademicSession** - e.g. `2026/2027`.
- Fields: `id`, `name` (unique), `startDate`, `endDate`, `isCurrent`.
- Constraints: at most one `isCurrent = true` (partial unique index); `startDate < endDate`.

**Term** - a term within a session.
- Fields: `id`, `sessionId`, `name`, `sequence` (1,2,3), `startDate`, `endDate`, `isCurrent`.
- Constraints: unique (`sessionId`, `sequence`); one current term overall. Number of terms is data, not code.

**Class** - e.g. JSS1 ... SS3 (optionally with an arm: "SS1 A").
- Fields: `id`, `name`, `arm` (optional), `levelOrder` (for promotion ordering), `isActive`.
- Constraints: unique (`name`, `arm`). Classes are persistent; *which students are in them* is per session via
  `StudentEnrollment`, which gives promotion and history for free.

**StudentEnrollment** *(supporting)* - student in a class for a session.
- Fields: `studentId`, `sessionId`, `classId`, `status`.
- Constraints: unique (`studentId`, `sessionId`) - a student is in one class per session.

**Subject** - e.g. Mathematics.
- Fields: `id`, `name`, `code` (unique), `isActive`. Plus **ClassSubject** (class x subject) for which subjects each
  class takes (drives "all required subjects entered" checks before publishing).

**TeacherAssignment** *(supporting, central to authorization)* - teacher may teach subject X to class Y in session Z.
- Fields: `teacherId`, `classId`, `subjectId`, `sessionId`.
- Constraints: unique on the four columns. This table, not the UI, decides which entries a teacher may write.

**Result** ("report" for one student for one term) - the unit that is drafted, reviewed and published.
- Fields: `id`, `studentId`, `termId`, `classId`, `gradingSchemeId`, `status`
  (DRAFT | SUBMITTED | PUBLISHED), `publishedAt`, `version` (optimistic concurrency), optional overall remarks
  (future teacher/principal comments).
- Relations: entries, publications.
- Constraints: **unique (`studentId`, `termId`)**. Student visibility rule: only `PUBLISHED` rows are ever returned to
  a student.
- Status meaning: `DRAFT` = being prepared ("Uploading / In Progress"); `SUBMITTED` = teacher finished, awaiting
  review; `PUBLISHED` = visible to the student. Unpublishing returns it to `DRAFT`, with the history kept in
  `ResultPublication`.

**ResultEntry** - one subject line within a Result.
- Fields: `id`, `resultId`, `subjectId`, `total`, `grade`, `remark`, `enteredById` (teacher/admin), timestamps.
- Constraints: unique (`resultId`, `subjectId`). `total`, `grade` and `remark` are **stored snapshots** computed by
  the grading service at save time, so changing the grading scheme later never silently rewrites old results.

**ResultEntryScore** - one component score of an entry (CA, Exam, ...).
- Fields: `entryId`, `componentId`, `score` (decimal).
- Constraints: unique (`entryId`, `componentId`); `0 <= score <= component.maxScore` (validated in Zod and the service,
  with a DB check constraint as backup).
- **Why not just `caScore` and `examScore` columns?** They would work today but force a schema change if the school
  adds CA1/CA2/CA3 or a practical. A component table keeps that a data change. *Open question for the school:* keep
  it simple (two columns) or flexible (component rows)? Recommendation: flexible, seeded with CA and Exam.

**GradingScheme / AssessmentComponent / GradeBand** *(supporting)* - the configurable grading structure.
- `GradingScheme`: `name`, `isActive`. `AssessmentComponent`: `name`, `maxScore`, `sequence`. `GradeBand`:
  `minScore`, `maxScore`, `grade`, `remark`. Bands must not overlap or leave gaps (validated on save).
- Each `Result` records the scheme it was computed under.

**ResultPublication** - append-only record of publish/unpublish actions.
- Fields: `id`, `resultId`, `action` (PUBLISHED | UNPUBLISHED), `actedById` (admin), `reason`, `createdAt`.
- Purpose: answers "who published this and when?" and survives repeated corrections. `Result.status` is the current
  state; this table is the history. Both change together in one transaction. Bulk publish (whole class/term) is
  one transaction creating many rows.

**Announcement** - news for the public site and/or portal.
- Fields: `id`, `title`, `body`, `audience` (PUBLIC | STUDENTS | TEACHERS | ALL_PORTAL), optional `classId`,
  `status` (DRAFT | PUBLISHED), `publishedAt`, `expiresAt`, `authorId`.
- Constraint: only `PUBLISHED` and unexpired rows are queried by the public site.

**AuditLog** *(supporting)* - security and integrity trail.
- Fields: `actorId`, `action`, `entityType`, `entityId`, `metadata` (JSON, no secrets), `ip`, `createdAt`.
- Written for logins (success/failure), role/status changes, result edits after submission, publish/unpublish.
  Append-only: no update/delete code paths.

---

## 7. Result workflow

```
Teacher selects academic session
 -> selects term
 -> selects class                       (only classes they are assigned to)
 -> searches for student                (only students enrolled in that class for that session)
 -> selects student
 -> enters subject results              (only subjects they are assigned to for that class)
 -> saves as DRAFT                      (can be saved partially, repeatedly)
 -> submits for review                  (Result: DRAFT -> SUBMITTED; teacher can no longer edit)
 -> admin reviews                       (can return to DRAFT with a reason if corrections are needed)
 -> admin publishes                     (Result: SUBMITTED -> PUBLISHED, ResultPublication row, audit log)
 -> student can view the published result
```

Rules:

- A `Result` row is created lazily when the first entry for (student, term) is saved. Several teachers can add their
  own subject entries to the same Result; each teacher can write only entries they are assigned to.
- **Publish guard:** a result can be published only if every required subject for the class (`ClassSubject`) has an
  entry and all scores are valid. Otherwise the admin sees what is missing.
- **Students never see unpublished results.** The student results query filters `status = PUBLISHED` in the DAL.
  For a term where the student is enrolled but no published result exists (no row, `DRAFT` or `SUBMITTED`), the UI
  shows: **"Result Upload in Progress"**. All three cases show the *same* message so the status of an in-progress
  result is not leaked, and incomplete scores are never sent to the browser.
- **Editing after publishing:** admin must unpublish first (back to `DRAFT`, recorded), edit, and republish. Every
  step is audited. The student sees "Result Upload in Progress" while it is unpublished.
- **Concurrent edits:** `Result.version` is checked on save (optimistic concurrency) to avoid two people silently
  overwriting each other.
- **Admin override:** admins may enter or correct entries directly; those writes are audited the same way.

---

## 8. Academic structure

Nothing below is hard-coded in components or constants.

- **Sessions** (`2026/2027`), **Terms** (First/Second/Third), **Classes** (JSS1-SS3), **Subjects**, **grading** are
  rows managed in the admin area.
- UI lists (dropdowns, tabs) are rendered from DAL queries. "Current session/term" comes from the `isCurrent` flags.
- A one-time **seed script** (`prisma/seed`) can insert the initial values (the six classes, three terms, the
  existing grading scale). That is data, deliberately kept out of component code and out of the schema file.
- Promotion at the end of a session = creating new `StudentEnrollment` rows for the next session (no data is
  overwritten, so old results always point to the class the student was actually in).

---

## 9. Result structure

Per subject: **Subject, CA score, Exam score, Total, Grade, Remark**, modelled as:

- Scores live as `ResultEntryScore` rows per `AssessmentComponent` (CA, Exam today; more later).
- `total` = computed by a pure function in `lib/services/grading` from the scheme's components (sum by default; a
  weighted rule can be added without schema change).
- `grade` and `remark` = looked up from `GradeBand` for the total.
- `total`, `grade`, `remark` are **stored on the entry** at save time (snapshot) and recomputed through the same
  function if a draft is edited. Changing the scheme affects only results created or recomputed afterwards.
- Class position, averages and overall comments are derived or added later at the `Result` level (see section 10).

---

## 10. Future extensibility

The model above is deliberately compatible with later features; none are built now.

| Future feature | Why the architecture does not block it |
|---|---|
| Parent portal | Add a `PARENT` role and `Parent` profile + `ParentStudent` link table; student-scoped DAL functions already take the owner from the session, so a parent policy "may view linked students" slots in beside it. |
| Attendance | New table keyed by `StudentEnrollment` + `Term`/date. |
| School fees | New tables referencing `Student` + `Term`; results can later be gated on payment as a policy, not a schema change. |
| Timetable | New tables referencing `Class`, `Subject`, `Teacher` (`TeacherAssignment` already links them). |
| Assignments | New tables referencing `Class`, `Subject`, `Teacher`, with file storage outside the DB. |
| Teacher / principal comments | Extra fields or a `ResultComment` table on `Result`. |
| Report card PDF | A service/route handler that renders from the same `Result` DTO, behind the same DAL authorization. |
| Notifications | Event table or queue fed by services (e.g. on publish); `Announcement` already models audience targeting. |
| Student promotion / class management | `StudentEnrollment` per session; promotion is "create next session's enrollments". |
| More roles / limited admins | Role enum plus `Admin.permissions`; policies are centralised in `can()`. |

Keeping this possible means: policies centralised, DTOs instead of raw rows, session/term/class as data, and
append-only history tables.

---

## 11. Security considerations (requirements for the implementation steps)

| Area | Requirement |
|---|---|
| Password hashing | Argon2id (preferred; confirm a build that works on Vercel, e.g. `@node-rs/argon2`) or scrypt via `node:crypto`. Per-password salt, tuned cost, never log or return hashes. Enforce a minimum length; check against common-password lists later. |
| Secure sessions | Opaque random token, only a hash stored in the DB; cookie `HttpOnly`, `Secure`, `SameSite=Lax`; absolute and idle expiry; rotate on login; revoke on logout, password change, suspension. |
| Server-side authorization | Enforced in DAL/services/actions as in section 5, never only in UI or `proxy.ts`. |
| Input validation | Every Server Action, Route Handler and form payload parsed with Zod (`safeParse`) before use; reject unknown fields; validate IDs, enums, score ranges, string lengths. |
| Zod | One schema per input in `lib/validation`, shared by client forms and the server; types come from `z.infer`. |
| Rate limiting | Login, registration, password reset and result-entry endpoints. Serverless instances share no memory, so use a shared store (e.g. Redis/Upstash or a DB table). Limit per IP and per account; add lockout/backoff. |
| CSRF | Server Actions check Origin vs Host; keep `SameSite` cookies; configure `serverActions.allowedOrigins` only if needed; any state-changing Route Handler must do its own Origin check and must not accept GET for mutations. |
| Environment variables | Real values only in Vercel/host settings and local `.env.local` (git-ignored). Only `NEXT_PUBLIC_*` reach the browser; never put secrets in them. Validate env at startup with Zod. Rotate `AUTH_SECRET` and DB password if ever exposed. |
| Audit logging | Append-only `AuditLog` for auth events and all result state changes (section 6). Never log passwords, tokens or full result contents. |
| Secure database access | TLS to the DB (`sslmode=require`), a least-privilege DB user for the app, pooled connections for serverless, migrations run from CI/admin machine with a separate credential, regular backups. Prisma parameterises queries; raw SQL is avoided or tagged-template only. |
| Student isolation | Student-facing DAL functions take no student ID; they use the session's student. Covered by automated tests (student A cannot read student B, via URL, action or API). |
| Preventing unauthorized result changes | Writes require role + `TeacherAssignment` + editable status, in one transaction; published results are immutable except via audited unpublish; `version` check; every change in `AuditLog`. |
| Other | Security headers / CSP, no secrets in client bundles, generic login error messages (no user enumeration), uniform response timing on login, dependency audit in CI (current scaffold reports 5 high advisories - see README/handover). |

---

## 12. Environment variables

`.env.example` (placeholders only, committed) lists: `DATABASE_URL`, optional `DIRECT_DATABASE_URL`, `AUTH_SECRET`,
`NEXT_PUBLIC_APP_URL`. Real values go in `.env.local` (git-ignored) locally and in Vercel project settings in
production. `prisma.config.ts` loads `.env.local` for Prisma CLI commands because Prisma 7 does not auto-load `.env`
files. Additional variables (email provider, rate-limit store) are added when those features are built.

---

## 13. Prisma 7.10 conventions in this project

- `prisma` and `@prisma/client` are both `7.10.0` (kept aligned; do not upgrade one alone).
- `prisma/schema.prisma` currently holds only the `generator` and `datasource` blocks - **no models**.
  - Generator is `prisma-client` (not the legacy `prisma-client-js`) with `output = "../src/generated/prisma"`.
    Import the client from `@/generated/prisma/client`, not from `@prisma/client`. The output folder is git-ignored.
  - The datasource block has **no `url`**: in Prisma 7 the connection URL lives in `prisma.config.ts`, not the schema.
- `prisma.config.ts` sets the schema path, migrations path, and `datasource.url` from `DATABASE_URL`.
- At runtime Prisma 7 requires a **driver adapter** (for PostgreSQL: `@prisma/adapter-pg` with `pg`) when constructing
  `PrismaClient`. These are **not installed yet**; they are added in the step that creates `lib/db.ts`.
- Migrations: `prisma migrate dev` locally, `prisma migrate deploy` in CI/production. Never run `migrate reset` or
  `db push` against a production database.
- `prisma init` also created agent "skills" folders and a sample `.env` with dummy credentials; those were removed
  because they are not part of this project.

---

## 14. TypeScript type strategy (avoid duplicated definitions)

One source of truth per kind of type:

| Kind | Source of truth | Where it lives |
|---|---|---|
| Database rows and enums | Prisma-generated types | `src/generated/prisma` (import types/enums from here; do not redeclare) |
| Input shapes (forms, actions) | Zod schemas; types via `z.infer<typeof schema>` | `lib/validation/*` |
| What the UI receives | DTO types derived from the DAL return type (`Awaited<ReturnType<typeof getX>>`) or small hand-written types when it must be stable | `types/` or beside the DAL function |
| Session / current user | One `SessionUser` type (`id`, `role`, profile id, name) | `types/auth.ts` |
| Roles, route paths, status labels | `as const` objects/enums defined once | `lib/constants.ts` |

Rules: never pass Prisma rows to Client Components (map to DTOs); never re-declare an enum by hand; keep
`types/` small - if a type can be derived, derive it. Prefer `strict` TypeScript (already on) and `unknown` over `any`.

---

## 15. Development rules

1. **Prefer server-side operations** (Server Components, Server Actions, Route Handlers) for data and mutations.
   Use Client Components only for interactivity.
2. **Keep components reusable** and presentational; data comes in as props.
3. **Avoid duplicated business logic.** One implementation of grading, publish rules and permission checks, in
   `lib/services` / `lib/auth/policies`.
4. **Validate all user input** with Zod on the server, even if the client validated too.
5. **Keep authentication and authorization separate.** "Who is this?" (`lib/auth/session`) is not "may they do this?"
   (`lib/auth/policies`).
6. **Never expose secrets to Client Components.** No secret env vars in client code; mark server modules with
   `import "server-only"`.
7. **Never trust client-side role information.** Always derive role and ownership from the server session.
8. **Keep database operations centralised** in `lib/dal` / `lib/services`. No Prisma calls in pages or components.
9. **Keep page components thin.** Pages parse params, call one DAL/service function, and render; business logic does
   not live in `page.tsx`.
10. **Do not hard-code academic data** (sessions, terms, classes, subjects, grades). They are database records.
11. **Read the bundled Next.js docs** (`node_modules/next/dist/docs/`) before using an API; this is a newer Next.js
    than most examples online.
12. **Small, reviewable steps.** Build one feature at a time; no placeholder pages or fake data.
