# Zion Baptist High School - Architecture

> Status: **design document.** Authentication (section 4), the database (section 6), the student dashboard (7.1) and the student result viewer (7.2) are implemented: `prisma/schema.prisma`, the migration
> `init_school_portal` applied to a local PostgreSQL 17 database, and a development seed. Role-based access exists for all
> portal areas. The teacher and admin dashboards and result entry/publishing are not built yet.

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
    (auth)/                     gateway and sign-in pages (shared brand-panel layout)
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

## 4. Authentication architecture (implemented)

**Goal:** establish *who the user is*, securely, on the server.

**Decision: a small custom implementation, no authentication library.** Reasons: the `Session` and `AuditLog` tables
already exist; database-backed sessions give instant revocation (deactivating a user or signing out ends access at
once), which Auth.js with a credentials provider cannot do without extra work; it adds no dependency; and the amount of
code is small enough to test completely. `AUTH_SECRET` in `.env.example` is currently unused (see "Not built yet").

### 4.1 How sign-in works

1. **Form** (`/portal/<role>/login`): a client form calls the `signIn` Server Action (`src/lib/auth/actions.ts`). The
   portal (student / teacher / admin) is bound to the page; the action validates everything again with Zod.
2. **`authenticate()`** (`src/lib/auth/service.ts`):
   - rate-limit check (below), then look up the user by `loginId`;
   - **always** verify an Argon2id hash (a dummy hash if the login ID does not exist), so timing does not reveal which
     login IDs are real;
   - fail if the password is wrong, the account is inactive, or the account's role is not the portal's role; the
     role/profile must also be consistent (a STUDENT must have a `Student` row);
   - **every failure returns the same result to the browser** ("Invalid login ID or password."); the true reason
     (`unknown_login_id`, `wrong_password`, `inactive_account`, `wrong_portal`, `inconsistent_account`) goes only to the audit log.
3. **Session creation:** a 256-bit random token (`crypto.randomBytes(32)`, base64url) is generated. **Only its SHA-256
   hash** is stored in `Session.tokenHash`; the raw token exists only in the cookie. Sessions older than a week are purged opportunistically.
4. **Cookie:** `__Host-zbhs_session` in production (`zbhs_session` in development because browsers need HTTPS for the
   prefix), `HttpOnly`, `Secure` (production), `SameSite=Lax`, `Path=/`, no `Domain`, expires with the session. It carries
   only the token: never a role, a user ID or any user data.
5. **Redirect:** to the home page of the role stored **in the database** (`/portal/student`, `/portal/teacher`, `/portal/admin`).

### 4.2 On every request

- `getCurrentUser()` (`src/lib/auth/current-user.ts`) reads the cookie, hashes it, loads the session and user, and returns
  a narrow `SessionUser` (id, loginId, role, names, and exactly one of `studentId` / `teacherId` / `adminId`), or `null`.
  Memoised per request with React `cache`. Because it reads cookies, it must run under `<Suspense>` (Cache Components).
- **Function map** (all server-only, in `src/lib/auth/`): `createSession()` (service.ts), `validateSessionToken()` =
  "get current session" (service.ts), `getCurrentUser()`, `requireUser()`, `requireRole(role)` (current-user.ts),
  `revokeSessionByToken()` = revoke session, `revokeAllSessionsForUser()` (service.ts), `setSessionCookie()` /
  `clearSessionCookie()` (cookies.ts), `hashPassword()` / `verifyPassword()` (password.ts), `SESSION_*` and `RATE_LIMIT`
  constants (config.ts).
- A session is valid only if it is not revoked, not past `expiresAt`, not idle too long, and the **user is still active**
  (and the account's role has its matching profile). The database is consulted every time, so revocation and deactivation
  take effect immediately. A session found expired or idle is **marked revoked** on the spot (one write, once).
- **Stale cookies are removed.** A page cannot delete a cookie while rendering, so when a request carries a cookie that no
  longer maps to a valid session, `requireRole()` / `requireUser()` redirect to `/portal/session-ended?to=<sign-in page>`
  (`src/app/portal/session-ended/route.ts`). That route re-validates, deletes the dead cookie (same attributes it was set
  with) and redirects to an **allow-listed** sign-in page. It never touches a valid session, so a link to it cannot sign
  anyone out, and it cannot be used as an open redirect (both covered by tests).
- Lifetimes (`src/lib/auth/config.ts`): students and teachers 7 days absolute / 24 hours idle; administrators 12 hours
  absolute / 2 hours idle. `lastUsedAt` is refreshed at most every 5 minutes.
- **`proxy.ts`** is only an optimistic gate: if there is no session cookie, `/portal/student|teacher|admin/**` (except
  `/login`) redirects to the right sign-in page. It never queries the database and never decides roles; a forged or expired
  cookie passes it on purpose and is rejected by the server-side check.
- `requireRole(role)` is called at the top of every protected page (and must be called in every Server Action and
  data function that returns private data). Not signed in -> that role's sign-in page; wrong role -> access denied,
  sent to the user's own home (a student opening `/portal/teacher` never sees teacher content).
- **`/portal` gateway:** for a visitor with a valid session it also shows "You are signed in as ..." with a
  "Continue to your dashboard" button and Logout. It never redirects automatically, so there is no redirect loop.
  **The protected layout is only a frame**: layouts do not re-run on client-side navigation, so they are never the security check.

### 4.3 Brute-force protection

Failed sign-ins are counted from the audit log (no Redis, **no schema change needed**): **8 failures per login ID**
within **15 minutes** blocks that ID, even with the correct password (the block is also audited). The **per-IP limit is
deliberately high (100 failures in 15 minutes)**: a whole school or computer lab can share one public IP address, and many
students mistyping at once must never lock everyone out; it only stops very large automated attacks from one address.
Login IDs are counted by a SHA-256 key, so non-existent IDs are limited exactly like real ones and typed values (which
may be a password typed into the wrong box) are never stored in clear. Trade-offs: a person can lock a specific account
for 15 minutes by failing deliberately (accepted; an admin unlock screen can come later); the IP is trusted only behind
Vercel, where the platform sets `x-forwarded-for` (locally it can be spoofed). The limits are constants in
`src/lib/auth/config.ts`.

### 4.4 Sign-out

The `signOut` Server Action (the **Logout** button, a real `<form>` POST) revokes the session in the database (`revokedAt`), records
`AUTH_LOGOUT`, and expires the cookie by overwriting it with the **same attributes** (a `__Host-` cookie ignores a
change that lacks `Secure`, so `cookies().delete()` is not used). `revokeAllSessionsForUser()` exists for password
changes and deactivation.

### 4.5 Audit events

`AUTH_LOGIN_SUCCESS`, `AUTH_LOGIN_FAILED`, `AUTH_LOGIN_BLOCKED`, `AUTH_LOGOUT` in `AuditLog` (user, IP, portal, hashed
login ID, failure reason). Never passwords, tokens or typed login IDs.

### 4.6 Testing

- **Unit and database tests** (`npm test`, vitest, 45 tests): token and password handling, input validation, configuration,
  sign-in success and every failure mode, rate limiting (per login ID, per IP, window expiry), session expiry, idle
  timeout, revocation, deactivation, role/profile consistency. Database tests run against a separate `*_test` database
  that is created and migrated automatically and can never be the development database. The tests were checked by
  deliberately breaking the code (removing the role check, the active check, hashing of tokens): the suite fails each time.
- **End-to-end** (real browser against the production build and the development database): redirects with no cookie,
  wrong password, forged cookie, replay of a signed-out cookie, role separation, deactivation, rate limiting, cookie
  attributes, hash-only storage, audit contents. 28/28 passed when this step was completed. These scripts are not yet
  part of the repository.

### 4.7 Not built yet

Password change and reset, "sign out everywhere" UI, an admin unlock screen for rate-limited accounts, CAPTCHA,
multi-factor authentication for administrators, and use of `AUTH_SECRET` (reserved for signing future tokens such as
password-reset links). Registration is not planned: accounts are created by an administrator.

---

## 5. Authorization architecture (foundation implemented)

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

## 6. Database design (final schema, `prisma/schema.prisma`)

The schema is implemented, migrated (`prisma/migrations/20261007155802_init_school_portal`) and seeded with fictional
development data (`prisma/seed.ts`). Conventions: `cuid` string IDs, `createdAt`/`updatedAt` on mutable tables, enums for closed sets, `Decimal`
for scores, and **no hard-coded academic values** (sessions, classes, subjects, components and grade bands are rows).
Table and model names are the same (PascalCase). 21 models, 5 enums.

### 6.1 Relationship diagram

```
User (loginId unique, passwordHash, role, isActive, names ...)
 |-- 0..1 Student  --< StudentEnrollment >-- SchoolClass, AcademicSession   (class per session)
 |                 --< Result  (see below)
 |-- 0..1 Teacher  --< TeacherAssignment >-- SchoolClass, Subject, AcademicSession
 |-- 0..1 Admin
 |-- N Session            (database-backed login sessions; only a token hash is stored)
 |-- N AuditLog           (actor; kept if the user is removed)
 |-- N Announcement       (createdBy)  >-- optional target SchoolClass (null = school-wide)
 |-- N ResultPublication  (publishedBy)
 '-- N Result             (publishedBy, optional)

AcademicSession --< Term      (e.g. 2026/2027 -> FIRST / SECOND / THIRD)
SchoolClass >--< Subject      via ClassSubject (per AcademicSession)

Result = one student's result for one term
  Result >-- Student, AcademicSession, Term (composite FK: term belongs to session), SchoolClass, GradingScheme
  Result --< ResultEntry >-- Subject
  ResultEntry --< ResultEntryScore >-- AssessmentComponent
  Result --< ResultPublication              (append-only PUBLISHED / UNPUBLISHED history)

GradingScheme --< AssessmentComponent       (CA, Exam, ... configurable)
GradingScheme --< GradeBand                 (A, B, C ... configurable)
```

### 6.2 Enums

| Enum | Values |
|---|---|
| `Role` | STUDENT, TEACHER, ADMIN |
| `Gender` | MALE, FEMALE |
| `TermName` | FIRST, SECOND, THIRD |
| `ResultStatus` | DRAFT, SUBMITTED, PUBLISHED |
| `EntryStatus` | DRAFT, SUBMITTED (per subject entry; see 7.3) |
| `PublicationAction` | PUBLISHED, UNPUBLISHED |

### 6.3 Models

| Model | Purpose | Key fields | Unique / indexes |
|---|---|---|---|
| `User` | Login identity, one role | loginId, passwordHash, role, firstName, lastName, email?, phone?, isActive | `loginId` unique; index (role, isActive) |
| `Student` | Student profile | userId, admissionNumber, dateOfBirth?, gender?, guardianName?, guardianPhone?, address? | `userId` unique, `admissionNumber` unique |
| `Teacher` | Teacher profile | userId, employeeNumber, department?, qualification? | `userId` unique, `employeeNumber` unique |
| `Admin` | Admin profile | userId | `userId` unique |
| `Session` | Database-backed login session | userId, tokenHash, expiresAt, lastUsedAt, revokedAt? | `tokenHash` unique; indexes userId, expiresAt |
| `AcademicSession` | e.g. 2026/2027 | name, startDate, endDate, isCurrent | `name` unique |
| `Term` | Term within a session | name (TermName), sessionId, dates, isCurrent | unique (sessionId, name); unique (id, sessionId) for the composite FK |
| `SchoolClass` | JSS 1 ... SS 3 | name, level (sort order), section?, isActive | unique (name, section); index level |
| `StudentEnrollment` | Student's class in a session | studentId, classId, sessionId, enrolledAt, isActive | unique (studentId, sessionId); index (classId, sessionId), sessionId |
| `Subject` | A subject | code, name, description?, isActive | `code` unique |
| `ClassSubject` | Subject offered by a class in a session | classId, subjectId, sessionId | unique (classId, subjectId, sessionId); indexes (sessionId, classId), subjectId |
| `TeacherAssignment` | Teacher teaches subject to class in session | teacherId, classId, subjectId, sessionId | unique on all four; index (classId, subjectId, sessionId), sessionId, subjectId |
| `GradingScheme` | A grading configuration | name, description?, isDefault | `name` unique |
| `AssessmentComponent` | A scored part (CA, Exam ...) | gradingSchemeId, name, shortName, maxScore, weight, sortOrder | unique (scheme, shortName), unique (scheme, name); index (scheme, sortOrder) |
| `GradeBand` | Grade for a score range | gradingSchemeId, grade, minScore, maxScore, remark, sortOrder | unique (scheme, grade); index (scheme, minScore) |
| `Result` | One student's result for one term | studentId, sessionId, termId, classId, gradingSchemeId, status, publishedAt?, publishedById? | unique (studentId, sessionId, termId); index (classId, termId, status), termId |
| `ResultEntry` | Subject line of a result | resultId, subjectId, status (EntryStatus), totalScore?, grade?, remark? | unique (resultId, subjectId); index subjectId |
| `ResultEntryScore` | One component score | resultEntryId, assessmentComponentId, score | unique (resultEntryId, assessmentComponentId); index component |
| `ResultPublication` | Publish/unpublish history | resultId, publishedById, publishedAt, action | index (resultId, publishedAt), publishedById |
| `Announcement` | School-wide or class news | title, content, isPublished, publishedAt?, expiresAt?, createdById, targetClassId? | index (isPublished, publishedAt), targetClassId, createdById |
| `AuditLog` | Security/integrity trail | userId?, action, entityType, entityId?, metadata? (JSON) | index (userId, createdAt), (entityType, entityId), createdAt |

Relation fields use Prisma's `...Id` naming for the scalar and the plain name for the relation (for example
`createdById` / `createdBy`, `publishedById` / `publishedBy`).

### 6.4 Foreign-key behaviour

- **CASCADE (children that have no meaning alone):** User -> Student / Teacher / Admin / Session; AcademicSession -> Term;
  GradingScheme -> AssessmentComponent / GradeBand; Result -> ResultEntry; ResultEntry -> ResultEntryScore.
- **RESTRICT (history is protected):** enrolments, class/subject offerings, teacher assignments, results, result
  publications and announcements cannot lose the thing they point to. A student, class, session, subject, grading
  scheme or user that owns history cannot be hard-deleted; **deactivate it instead** (`isActive`).
- **SET NULL:** `Result.publishedBy` and `AuditLog.user`, so removing a user never deletes the record.
- **Composite foreign key:** `Result (termId, sessionId) -> Term (id, sessionId)`. The database itself guarantees that a
  result's term belongs to the result's session, even though both IDs are stored for direct queries.

### 6.5 Rules enforced outside Prisma

Prisma cannot express these. Where PostgreSQL can enforce them they are now **in the database**, as hand-written SQL
appended to the first migration (marked in the file; keep it if the migration is ever regenerated). The rest stay in the
service layer. They are also listed at the bottom of `schema.prisma`:

1. `User.role` matches the profile that exists (service, one transaction).
2. At most one `isCurrent` session, one `isCurrent` term and one `isDefault` grading scheme. **In the database:** partial unique indexes `AcademicSession_only_one_current`, `Term_only_one_current`, `GradingScheme_only_one_default`. (Switching the current session or term therefore means clearing the old flag in the same transaction.)
3. `SchoolClass (name, section)`: PostgreSQL treats NULL sections as distinct, so classes without a section need a partial unique index on `name WHERE section IS NULL`. **In the database:** `SchoolClass_name_when_no_section`.
4. Score ranges, band ranges and dates. **In the database:** `ResultEntryScore.score >= 0` (CHECK) and `score <= component.maxScore` (trigger `ResultEntryScore_score_max_trigger`, because it needs the component row); `GradeBand` `0 <= minScore <= maxScore`; `AssessmentComponent` `maxScore > 0` and `0 < weight <= 100`; `startDate < endDate` on sessions and terms. Zod still validates the same rules for friendly error messages.
5. **In the database:** grade bands of one scheme cannot overlap (exclusion constraint `GradeBand_no_overlap`, uses the `btree_gist` extension; inclusive ranges). **In the service layer:** a scheme's component weights add up to 100 and grade bands leave no gaps (a sum across rows cannot be checked row by row without blocking one-at-a-time inserts).
6. A result's class equals the student's enrolment class for that session; an entry's subject is offered by that class
   (`ClassSubject`); a teacher writes only subjects they are assigned (`TeacherAssignment`) (service + policies).
7. Published results are immutable: unpublish (recorded) -> edit -> republish.

### 6.6 Differences from the earlier planning draft

Decisions made when the schema was finalised: accounts are created by an admin and have `isActive` (no PENDING/REJECTED
registration states yet); `Term.name` is the `TermName` enum (no `sequence` column); classes use `level` (sort order)
and `section` rather than `levelOrder`/`arm`; there is no `Result.version` column (optimistic concurrency can use
`updatedAt` or be added later); `ResultPublication` has no `reason` and `AuditLog` has no `ip` column. Each can be added
later as a non-breaking migration if needed.

### 6.7 Why the schema is shaped this way

- **Why `StudentEnrollment` exists.** A student's class changes every year. Putting a `classId` on `Student` would
  overwrite history the moment a student is promoted. An enrolment row per student per session keeps every year
  (JSS 1 in 2025/2026, JSS 2 in 2026/2027), makes class rosters a simple query, makes promotion "create next session's
  enrolments", and lets old results keep pointing at the class the student was actually in.
- **Why results use DRAFT -> SUBMITTED -> PUBLISHED.** Teachers need to save incomplete work (DRAFT) without anyone
  seeing it; they then hand it over for checking (SUBMITTED, teacher editing locked); only an admin publishes
  (PUBLISHED). Students only ever receive PUBLISHED results, so half-entered or unchecked scores never leak. Anything
  else shows "Result Upload in Progress". Unpublishing returns a result to DRAFT, and every publish/unpublish is
  recorded in `ResultPublication`.
- **Why assessment components are flexible.** CA and Exam are rows (`AssessmentComponent`) with a maximum score and
  weight, and each score is a row (`ResultEntryScore`). If the school moves to CA 1, CA 2, Practical, Project and Exam,
  that is new rows in a new `GradingScheme`, not a schema change. Grade bands are rows too. Each `Result` records the
  scheme it used, and `totalScore`, `grade` and `remark` are stored snapshots, so changing the scheme later never
  rewrites old results. Total = sum of (score / maxScore x weight) over the components; weights should add up to 100.
- **Why student result pages must never trust a `studentId` from the URL.** A URL or form value is chosen by the person
  making the request; anyone can edit it. If a page accepted a student ID it would be possible to read someone else's
  results by changing one value. Student-facing data functions therefore take **no** student ID: they read the signed-in
  user from the server-side session, find that user's `Student` row, and filter by it (plus `status = PUBLISHED`). The
  only identifier a student can supply is a term, and it is always combined with their own student ID on the server.
- **Why teachers must be restricted through `TeacherAssignment`.** The `TEACHER` role alone says "this is a teacher",
  not "this teacher teaches Physics to SS 2 this year". Without the assignment check, any teacher could edit any
  student's marks. Every teacher read or write of results must confirm a `TeacherAssignment` row for that
  (teacher, class, subject, session), inside the same transaction as the write.
- **Why `AuditLog` exists.** Result changes, publishing, account changes and password changes are exactly where
  disputes and mistakes happen. An append-only record of who did what, to which record, and when, lets the school
  investigate ("who changed this mark?") and lets developers detect abuse. `ResultPublication` answers the narrower
  "who published this result and when"; `AuditLog` covers everything else. Entries survive removal of the user
  (`SET NULL`) and must never contain passwords, tokens or full result data.

### 6.8 Development seed (`prisma/seed.ts`)

Fictional data only, safe to re-run (verified: identical row counts and unchanged password hashes on a second run).
Contents: 1 admin, 3 teachers (`TCH001`-`TCH003`), 6 students (`ZBHS/2026/001`-`006`, who log in with their admission
number), session 2026/2027 with FIRST (current), SECOND and THIRD terms plus last session 2025/2026 (not current, three terms), classes JSS 1 - SS 3,
8 subjects, 72 class-subject offerings (both sessions), 12 teacher assignments, 8 enrolments (6 current, 2 historical), the grading scheme "Standard Secondary School Grading" (CA 40 / Exam 60;
bands A 70-100, B 60-69.99, C 50-59.99, D 40-49.99, F 0-39.99), and 7 results: this session's First Term (Daniel PUBLISHED, Grace SUBMITTED, Esther and Samuel DRAFT) and last session's history
(Samuel's Third Term PUBLISHED and Second Term DRAFT, Esther's Third Term PUBLISHED, each in the class the student was in then),
with 3 `ResultPublication` rows, 23 entries and 46 component scores whose totals, grades and remarks
are computed from the grading rows in the database, plus 8 announcements (5 visible to the right audiences and 3 that must stay hidden:
unpublished, expired, and scheduled for the future) used to check the student dashboard's filtering. All demo accounts share one documented DEVELOPMENT-ONLY password,
stored only as an Argon2id hash. The seed never runs when `NODE_ENV=production` or against a non-local database.

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
- **Concurrent edits:** `Result.updatedAt` is compared on save (optimistic concurrency; a `version` column can be added later) to avoid two people silently
  overwriting each other.
- **Admin override:** admins may enter or correct entries directly; those writes are audited the same way.

### 7.1 Student dashboard (implemented: `/portal/student`)

**Identity.** The student is always the signed-in one. `getStudentDashboard()` and `getStudentProfileSummary()`
(`src/lib/services/student.ts`) take **no student ID**: they call `requireRole("STUDENT")` (database-checked session), read
`studentId` from that validated session, and pass it to an internal loader (`student-dashboard.ts`) that pages never import.
There is no student ID in any URL; `/portal/student/<anything>` other than the real sub-pages is a 404, and query strings
such as `?studentId=...` are ignored (all verified in the browser).

**Result privacy (the key rule).** A student must never receive an individual score, grade, total or remark before the
whole result is PUBLISHED. The dashboard goes further: it never receives them at all, even when published (the detailed
result page is a later step). Three layers enforce this:
1. The result query selects only `status` and `publishedAt`: it never touches entries, scores, grades or subjects.
2. The return type (`StudentResultStatus` in `src/types/student.ts`) has no field that could carry them; the result card
   component only accepts that type.
3. Tests: unit tests give DRAFT, SUBMITTED and PUBLISHED results distinctive secret values and assert none appears in the
   returned object; browser tests scan the page HTML and every server response for subject names, score/grade/remark
   keys and other students' names or admission numbers.

| Database state (current term) | `result.state` | What the student sees |
|---|---|---|
| No current session/term | `NO_TERM` | "No active term" |
| No active enrolment this session | `NO_ENROLLMENT` | "No class for this session" |
| No result row | `NOT_STARTED` | "No result yet" |
| DRAFT or SUBMITTED | `IN_PROGRESS` | "Result Upload in Progress" (no button) |
| PUBLISHED | `PUBLISHED` | "Your result is available" + **Check Result** |

Only the **current** term counts: a published result from another term does not make the card say "available". The
"Check Result" quick action is a link only for `PUBLISHED`; otherwise it is plain, explained text. (Showing "In progress"
versus "No result yet" reveals that a teacher has started a result, but nothing about its content.)

**Announcements.** Up to 5, newest first: `isPublished`, `publishedAt` empty or not in the future, `expiresAt` empty or in the
future, and school-wide or addressed to the student's class in the current session. Content is shown as shortened plain text.

**Dates and greeting.** "Good morning / afternoon / evening" and displayed dates use the school's time zone
(`siteConfig.timeZone`, Africa/Lagos), never the server's clock (Vercel runs in UTC). Which session and term are current,
the class, and the names all come from PostgreSQL; nothing is hard-coded.

**Layout and rendering.** Sidebar from `lg`; below that a compact header with a menu sheet. The dashboard is a single column
until `xl` (1280px), then two columns. The student layout is a frame only (it protects nothing); each page and data function
checks the session. With Cache Components, the session-reading parts are under `<Suspense>`: the static frame and skeletons
are prerendered and the user's data streams in (route type "Partial Prerender"). `/portal/student/profile` and
`/announcements` are temporary "coming soon" pages that enforce the role and show no data, so the sidebar never leads to a 404.

### 7.2 Student result viewer (implemented: `/portal/student/results`)

**Who.** Same rule as the dashboard: the student is whoever is signed in. `getStudentResultView(termKey?)`
(`src/lib/services/student.ts`) takes **no student ID**; it validates the session, takes `studentId` from it and passes it to
`src/lib/services/results.ts`. There is no `/results/[studentId]`; `?studentId=`, `?admission=` and every other query
parameter are ignored, and `/portal/student/results/<anything>` is a 404. Teachers and admins are turned away (redirect
to their own home); signed-out visitors go to the student sign-in page. Verified in the browser, including the raw
server-component payload requested with the `RSC: 1` header.

**Choosing a term.** The page URL can carry `?term=2026-2027-first`: a *term reference* built from the session name and term
name, never a database ID. The server matches it only against **this student's own** list of terms and redirects to the
default when it is unknown, malformed, repeated, or belongs to a session the student was never part of. The list contains
terms of the sessions the student was enrolled in (or has a published result in) that have started, plus any term with a
published result, newest first; **only published results count when deciding what to list**, so a draft cannot make a term
appear. The default is the current term, otherwise the newest. The selector is a native `<select>` inside a Next.js GET
`<Form>` (client-side navigation; a "View" button appears without JavaScript).

**Privacy.** A `ResultSheet` (`src/types/results.ts`) exists only for a PUBLISHED result. The marks query contains
`status: "PUBLISHED"` in its `where`, so draft and submitted marks are never even read from the database. Every
non-published situation (draft, submitted, nothing yet) returns the same status-only view and the same message:
"Result Upload in Progress. Your result for this term has not been published yet. Please check back later."
No database IDs appear in any payload. Tests: unit tests give DRAFT/SUBMITTED results secret values and assert none appear in
the returned object; browser tests scan the HTML and every server response for subject names, marks, remarks and sheet markers.

**Data shown.** Everything comes from the database and nothing is recalculated: columns are the assessment components of
the result's **own grading scheme** (so an old term keeps its old columns after the scheme changes, and adding a "Practical"
component makes a new column appear with no code change); per-subject total, grade and remark are the **stored snapshots**;
the grading key is the scheme's own `GradeBand` rows; the class shown is the class the student was in **at that time**.
Summary: number of subjects, overall total (sum of stored totals), average (that sum divided by the number of subjects
that have a total, 2 decimal places) and a count of subjects per stored grade, ordered as the scheme's grade bands.
No grade letter, band or component name is written in the UI code.

**Layout and printing.** A white result "sheet" with the school mark and name, student details, table, summary and grading
key. On phones the table is full-width inside the sheet, the remark moves under the subject name and the cells tighten, so
Subject, each component, Total and Grade fit a 320px screen without scrolling; a scheme with many components still keeps the page
from overflowing by scrolling the table inside its own focusable box. "Print Result" calls `window.print()`; print styles
(`print:` utilities and an `@media print` block in `globals.css`) hide the sidebar, header, term selector and buttons and
set A4 portrait with 14 mm margins, black-on-white with ruled table lines. It fits one A4 page. No PDF generator exists.

**Reuse.** `results.ts` is deliberately written for later screens: `listAvailableTerms`, `loadPublishedResult` and the pure
`buildResultSheet` take an explicit student ID and **authorize nothing**; the teacher and admin screens must call them only
after their own authorization checks (assignment for teachers, role for admins). Student pages call them only through
`student.ts`.

### 7.3 Teacher portal (implemented: `/portal/teacher`, `/classes`, `/results`)

**Who.** The teacher is whoever is signed in. `src/lib/services/teacher.ts` (public, session-bound) accepts **no teacher, class,
subject or student ID**: `requireRole("TEACHER")` provides the teacher profile and everything is derived from it. The browser
names a class only by key (`jss-1`) and a subject only by code (`MTH`); the server matches that pair against the teacher's own
`TeacherAssignment` rows **for the current session**. A pair that is not an assignment (another teacher's, an unassigned
subject, last session's, made-up keys, raw IDs) is refused with the same answer, shows no student data, and is audited as
`TEACHER_ACCESS_DENIED`. Saving re-checks the assignment, then that every admission number in the request belongs to the
class roster, then that every score name is a component of the grading scheme, then every value; the whole save is
all-or-nothing. A student from another class in an otherwise valid request rejects the entire request.

**Layers.** `teacher-workspace.ts` (reads) and `teacher-results.ts` (writes) are internal and authorize via the assignment lookup
they perform; `teacher.ts` / `teacher-actions.ts` are the only entry points the UI uses. `validation/teacher.ts` parses the
form (only `classKey`, `subjectCode`, `intent` and `score::<admission>::<component>` cells are read; anything else, such as a
browser-supplied total or grade, is ignored).

**Grading.** `src/lib/services/grading.ts` is pure and shared: the server recalculates every total, grade and remark from the raw
scores using `AssessmentComponent` and `GradeBand` rows (no hardcoded CA/Exam or grade ranges); the browser reuses the same
functions only for the live preview. Total = sum of score / maxScore x weight, rounded to 2 dp. A partly filled entry gets no
total or grade. A total that falls in a gap between bands cannot be submitted.

**Workflow and statuses.** Teachers have exactly two intents, `draft` and `submit`; there is no publish intent anywhere in the form,
parser, action or service. Each subject line carries its own `EntryStatus`. Submitting requires every student of the class to
have complete scores for that subject and locks the entries (`SUBMITTED`); a teacher cannot edit locked entries, entries under a
different grading scheme, or any entry of a `PUBLISHED` result. A student's `Result` moves `DRAFT -> SUBMITTED` automatically only
when **every** `ClassSubject` of the class is submitted (audited as `RESULT_READY_FOR_REVIEW`); `PUBLISHED` is reserved for the
Admin portal (not built). The teacher UI says "awaiting administrative publication".

**Students.** Nothing changes for students: they only ever receive data from `PUBLISHED` results, so draft, submitted and
ready-for-review work stays behind "Result Upload in Progress" (verified in unit tests and in the browser).

**Audit actions.** `TEACHER_SCORE_CHANGED` (per entry: class, subject, term, session, admission number, component from/to),
`TEACHER_RESULT_DRAFT_SAVED`, `TEACHER_RESULT_SUBMITTED`, `RESULT_READY_FOR_REVIEW`, `TEACHER_ACCESS_DENIED`. No passwords,
tokens or hashes are ever logged. Saving unchanged values writes nothing.

**UI.** Teacher shell mirrors the student shell (sidebar from `lg`, sheet menu below). Result grid uses ARIA table roles so one set of
inputs serves both layouts (stacked cards on phones, columns from `md`). Submit needs a confirmation dialog.

**Testing.** `grading.test.ts` and `teacher.test.ts` (database tests: authorization, search, validation, workflow, audit, student
invisibility); browser suite `teacher-e2e.mjs` covers dashboard numbers, URL tampering, role isolation, validation, live
preview, draft, submit, student view and 320-1440px layouts.

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
| Preventing unauthorized result changes | Writes require role + `TeacherAssignment` + editable status, in one transaction; published results are immutable except via audited unpublish; `updatedAt` concurrency check; every change in `AuditLog`. |
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
- `prisma/schema.prisma` holds the full schema (section 6): 21 models, 5 enums. `prisma validate` and `prisma generate`
  need no database.
- **Migrations:** `prisma/migrations/20261007155802_init_school_portal` (21 tables, 5 enums, 32 foreign keys, plus the
  hand-written rules from 6.5: 4 partial unique indexes, 6 CHECK constraints, 1 exclusion constraint, 1 trigger). Prisma
  does not see those extras, so `prisma migrate diff` reports no drift, but a regenerated migration would lose them.
  Add future rules the same way (a new migration with plain SQL).
- **Runtime client:** `src/lib/db.ts` is the only place the client is created: `PrismaClient` from the generated
  output, with the `@prisma/adapter-pg` driver adapter (`pg` pool, max 5) and a `globalThis` singleton so Next.js hot
  reload does not open new pools. It starts with `import "server-only"` and is imported only by the data layer.
- **Seed:** `prisma/seed.ts` (run with `npx prisma db seed`, configured in `prisma.config.ts` as `tsx prisma/seed.ts`).
  It is idempotent (upserts by natural keys), refuses to run when `NODE_ENV=production`, and uses its own client
  because `db.ts` is server-only.
- **Password hashing:** `@node-rs/argon2` (Argon2id, 19 MiB, 2 passes, 1 lane). The seed hashes the shared development
  password; nothing in the application logs in yet.
- **Local development database:** PostgreSQL 17 on `localhost:5432`, database `zion_baptist_high_school`, owned by a
  limited role `zion_app` (with `CREATEDB` for Prisma's shadow database). The connection string lives only in
  `.env.local` (git-ignored); see README "Local Database Setup".
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
