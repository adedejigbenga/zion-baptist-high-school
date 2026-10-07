# Zion Baptist High School - Design System

> Status: **foundation.** Tokens, utilities and base components exist. No pages, dashboards, login forms or
> navigation components have been built; sections 10-13 describe how those must look when they are built.
>
> Source of truth in code: [src/app/globals.css](src/app/globals.css) (tokens + utilities) and
> [src/components/ui/](src/components/ui/) (shadcn/ui components, customised). If this document and the code
> disagree, the code wins and this document should be corrected.

---

## 1. Brand direction

Modern, professional, academic, trustworthy, clean and welcoming. Think "premium school management platform",
not "old school website" and not "generic admin template".

How that translates into rules:

- **Purple is the accent, not the wallpaper.** Most surface area is white, near-white (`background`) and very
  light lavender (`surface-subtle`). Purple appears in primary actions, active navigation, key numbers, links,
  focus rings and the occasional hero/featured card.
- **Calm and spacious.** Generous padding, one clear action per view, short lines of text.
- **Soft, not bubbly.** Slightly rounded corners (8px controls, ~12px cards), hairline borders, very light shadows.
- **Gradients are rare.** At most one brand gradient surface per view (`bg-brand-gradient`).
- **Content first.** Results, names, scores and dates are the interface. Decoration never competes with them.
- **Light theme only for now.** Dark mode is deliberately deferred; the token structure supports adding it later
  by overriding the semantic tokens in a `.dark` block.

---

## 2. Color palette

Colours are defined in three layers. **Components use only the semantic layer.**

| Layer | Where | Example | Used by |
|---|---|---|---|
| Primitives | `@theme` in globals.css | `brand-700` | Rare, deliberate brand shades (`bg-brand-100`) |
| Semantic | `:root` in globals.css | `--primary`, `--muted-foreground` | Everything: `bg-primary`, `text-muted-foreground` |
| Bridge | `@theme inline` | `--color-primary` | Makes semantic tokens Tailwind utilities |

### Brand scale (primitives)

| Token | Hex | Role |
|---|---|---|
| `brand-50` | `#F5F3FF` | Very light lavender: subtle panels, table header, empty states |
| `brand-100` | `#EDE9FE` | Light purple: secondary button, active nav item, skeletons |
| `brand-200` | `#DDD6FE` | Hover for light purple, selection |
| `brand-300` | `#C4B5FD` | Decorative only |
| `brand-400` / `500` | `#A78BFA` / `#8B5CF6` | Decorative / illustration |
| `brand-600` | `#7C3AED` | Secondary purple: focus ring, gradient end |
| `brand-700` | `#6D28D9` | **Primary purple**: primary buttons, links |
| `brand-800` | `#5B21B6` | Hover/active, text on light purple |
| `brand-900` | `#4C1D95` | **Deep purple**: headings accents, gradient start |
| `brand-950` | `#2E1065` | Darkest: overlay tint, shadow tint |

### Semantic tokens

| Token | Hex | Purpose |
|---|---|---|
| `background` | `#FAFAFC` | Page background |
| `card` / `popover` | `#FFFFFF` | Raised surfaces |
| `surface-subtle` / `muted` | `#F5F3FF` | Tinted panels, table header, hover rows |
| `foreground` | `#1F2937` | Primary text |
| `muted-foreground` | `#5B6475` | Secondary text (darkened from `#6B7280`, see below) |
| `border` | `#E5E7EB` | Decorative dividers and card outlines |
| `input` | `#868B9B` | **Form control borders** (stronger than `border`, see below) |
| `ring` | `#7C3AED` | Focus indicator |
| `primary` / `primary-foreground` | `#6D28D9` / `#FFFFFF` | Primary actions |
| `secondary` / `secondary-foreground` | `#EDE9FE` / `#4C1D95` | Secondary actions, active nav |
| `accent` / `accent-foreground` | `#EDE9FE` / `#4C1D95` | Hover highlight in menus |
| `destructive` (+ `-foreground`) | `#DC2626` / `#FFFFFF` | Delete, suspend, unpublish |
| `success` (+ `-foreground`) | `#15803D` / `#FFFFFF` | Positive solid |
| `warning` (+ `-foreground`) | `#B45309` / `#FFFFFF` | Caution solid |
| `info` (+ `-foreground`) | `#2563EB` / `#FFFFFF` | Informational solid |

Each feedback colour also has a **soft** triple for badges and alerts:
`{status}-soft` (background), `{status}-soft-foreground` (text), `{status}-soft-border`.

| Status | Soft bg | Soft text | Soft border |
|---|---|---|---|
| neutral | `#F3F4F6` | `#374151` | `#D1D5DB` |
| info | `#EFF6FF` | `#1E40AF` | `#BFDBFE` |
| success | `#F0FDF4` | `#166534` | `#BBF7D0` |
| warning | `#FFFBEB` | `#92400E` | `#FDE68A` |
| destructive | `#FEF2F2` | `#991B1B` | `#FECACA` |

Sidebar tokens (`sidebar`, `sidebar-foreground`, `sidebar-primary`, `sidebar-accent`, `sidebar-border`, ...) are
set for a **white sidebar with a lavender active item**. Chart tokens `chart-1..5` are reserved for later.

### Where the starting palette was adjusted (all measured, WCAG 2.x)

| Starting value | Problem | Used instead | Ratio |
|---|---|---|---|
| Secondary text `#6B7280` | 4.4:1 on lavender `#F5F3FF` (fails 4.5:1) | `#5B6475` | 5.4:1 on lavender, 5.7:1 on background |
| Border `#E5E7EB` for inputs | 1.2:1 on white; WCAG 1.4.11 wants 3:1 for control boundaries | `--input` `#868B9B` | 3.4:1 on white |
| Success `#16A34A` as text | 3.3:1 on white | `#15803D` | 5.0:1 |
| Warning `#D97706` as text | 3.2:1 on white | `#B45309` | 5.0:1 |

Other measured pairs: body text `#1F2937` on white 14.7:1; white on primary `#6D28D9` 7.1:1; primary text on white
7.1:1; white on destructive `#DC2626` 4.8:1; soft badges 6.4-7.2:1; focus ring `#7C3AED` on white 5.7:1.
**Re-measure whenever a colour token changes.**

Rules:

- Never write a hex value or `bg-violet-*` in a component. Use semantic tokens (`bg-primary`, `text-muted-foreground`,
  `border-input`) or, if a brand shade is truly needed, `brand-*`.
- Never use `muted-foreground` for text smaller than 12px, and never use `brand-300` or lighter for text.

---

## 3. Typography

**One family: Plus Jakarta Sans** (Google Fonts via `next/font`, variable weight, `display: swap`). It reads as
modern and friendly with a confident, premium feel, and is highly legible in tables. Weights used: **400, 500, 600,
700** only. Monospace falls back to the system stack (no second font is loaded).

| Utility | Size (mobile - desktop) | Line height | Weight | Use |
|---|---|---|---|---|
| `type-display` | 36px - 60px (fluid) | 1.1 | 700 | Public hero headline only (once per page) |
| `type-page-title` | 24px - 32px (fluid) | 1.2 | 700 | `<h1>` of every portal page |
| `type-section-title` | 20px - 24px (fluid) | 1.3 | 600 | `<h2>` section headings |
| `type-card-title` | 16px | 1.4 | 600 | Card and panel headings (`CardTitle`) |
| `type-body` | 16px | 1.65 | 400 | Paragraph text |
| `type-body-sm` | 14px | 1.6 | 400 | Secondary text, descriptions |
| `type-label` | 14px | 1.25 | 500 | Form labels, nav items |
| `type-caption` | 12px | 1.4 | 500 | Captions, badges, hints |
| `type-table` | 14px | 1.4 | 400, tabular numbers | Table cells (headers: 13px / 600) |
| `type-stat` | 28px - 36px (fluid) | 1.1 | 700, tabular numbers | Big numbers on stat cards, scores |

Rules:

- Use exactly one `<h1>` per page, and keep heading levels in order. The utility sets the *look*; the tag sets the *meaning*.
- Form control text is 16px on small screens (prevents iOS zoom on focus) and 14px from `md` up (built into `Input`, `Select`, `Textarea`).
- Numbers that line up in columns (scores, totals, counts) use tabular figures (`type-table`, `type-stat`).
- Do not add font weights or families. Do not use all-caps for long text.

---

## 4. Spacing

Tailwind's 4px scale is the base. On top of it, semantic **layout tokens** change with the screen size, so pages
never hand-pick padding.

| Token | Mobile | `sm` 640+ | `lg` 1024+ | Used by |
|---|---|---|---|---|
| `--page-gutter` | 16px | 24px | 32px | `page-container` side padding |
| `--section-y` | 48px | 64px | 80px | `page-section` vertical padding (public site) |
| `--card-pad` | 20px | 20px | 24px | Card padding |
| `--grid-gap` | 16px | 20px | 24px | `stack-page`, `grid-cards` gaps |
| `--container-page` | 1280px max width | | | `page-container` |

| Utility | Purpose |
|---|---|
| `page-container` | Centred content column with responsive gutters |
| `page-section` | Vertical rhythm between public-site sections |
| `stack-page` | Vertical flow of blocks on a portal page (uses `--grid-gap`) |
| `stack-form` | 20px between form fields |
| `stack-field` | 8px between label, control and hint/error |
| `grid-cards` | Auto-fill grid of cards (min 256px per card, 1 column on phones) |

Fixed conventions: space between icon and label 8px; space between a heading and its content 8-12px; sidebar item
height 44px; page header block bottom margin = `--grid-gap`.

---

## 5. Border radius

Base token `--radius: 0.5rem` (8px). Everything derives from it.

| Class | Size | Use |
|---|---|---|
| `rounded-md` | ~6px | Menu items, small chips, table cell contents |
| `rounded-lg` | 8px | **Buttons, inputs, selects, alerts, tables** |
| `rounded-xl` | 12px | **Cards**, sheets, large panels |
| `rounded-full` | pill | Badges, avatars only |

Do not use `rounded-2xl` or larger on content cards, and never on inputs/buttons.

---

## 6. Shadows

Soft, low, tinted deep purple (`rgb(46 16 101 / x)`) instead of grey-black, so shadows feel part of the brand.

| Utility | Use |
|---|---|
| `shadow-xs` | Default for cards, buttons, inputs: a hint of lift |
| `shadow-sm` | Sticky header when scrolled |
| `shadow-md` | Hover on interactive cards, featured (brand) card |
| `shadow-lg` | Overlays only: dropdowns, select popups, sheets, dialogs |

Cards rely on a hairline `border` first; shadow is secondary. Do not stack a shadow on a shadow.

---

## 7. Buttons

Component: [button.tsx](src/components/ui/button.tsx). Props: `variant`, `size`, `loading`, `disabled`.

| Variant | Look | Use |
|---|---|---|
| `default` (Primary) | Solid purple, white text | The single main action in a view |
| `secondary` | Light purple fill, deep-purple text | Supporting action beside a primary |
| `outline` | White, visible grey-purple border | Neutral alternatives (Cancel, Back) |
| `ghost` | Transparent; fill on hover | Toolbars, table row actions, icon buttons |
| `destructive` | Solid red, white text | Delete, suspend, unpublish (always confirm) |
| `success` | Solid green, white text | Positive confirmation (e.g. Publish) |
| `link` | Underlined text | Low-emphasis action inside text |

Sizes: `xs`, `sm`, `default` (40px), `lg` (48px), `icon`, `icon-xs`, `icon-sm`, `icon-lg`.
On touch devices (`pointer: coarse`) the default and `sm` sizes grow to 44px / 40px automatically.

States:

- **Hover:** background darkens ~14% (`color-mix`), outline gets a purple tint.
- **Active:** darkens ~26% and moves down 1px.
- **Focus-visible:** 2px solid `ring` outline with 2px offset (destructive and success use their own colour). Never remove it.
- **Disabled:** 50% opacity, not clickable. Use sparingly; prefer explaining why an action is unavailable.
- **Loading:** `loading` shows a spinner before the label, sets `aria-busy`, and blocks repeat clicks. Keep the label text.

A **button** performs an action (fills, borders, `<button>`); a **link** navigates (underlined text, `<a>`). Use
`buttonVariants()` to style a Next.js `<Link>` like a button when navigation should look like a call-to-action.

---

## 8. Forms

Components: `Input`, `Textarea`, `Select`, `Checkbox`, `RadioGroup`, `Label`, `SearchInput`, `PasswordInput`,
`FormHint`, `FormError` (all in `src/components/ui/`).

Anatomy of a field (wrap in `stack-field`; separate fields with `stack-form`):

```
Label (type-label, optional red * via required)
Control (44px high on mobile, 40px from md; 16px text on mobile)
FormHint (type-caption, muted)   or   FormError (icon + message, destructive colour)
```

Rules:

- Every control has a real `<label>` (`htmlFor`/`id`). Placeholders are examples, never labels.
- Control borders use `border-input` (3:1+). Hover tints the border purple; focus shows a solid purple border plus a soft ring.
- Errors: set `aria-invalid` on the control, render `FormError`, and link it with `aria-describedby`. The message
  contains an icon and text, so it is not colour-only.
- Mark required fields with `<Label required>` and also state the rule once in the form ("Fields marked * are required").
- Checkbox and radio visible size is 20px; their hit area extends 8px beyond it. Pair them with a clickable label.
- `PasswordInput` toggles visibility with a labelled button (`aria-pressed`). `SearchInput` uses `type="search"` and needs a label or `aria-label`.
- Group related radios/checkboxes in a `<fieldset>` with a `<legend>`.

---

## 9. Cards

Component: [card.tsx](src/components/ui/card.tsx): `Card`, `CardHeader`, `CardTitle`, `CardDescription`,
`CardAction`, `CardContent`, `CardFooter`.

| Variant | Look | Use |
|---|---|---|
| `default` | White, hairline border, `shadow-xs` | Statistics, announcements, result summaries, profiles |
| `subtle` | Lavender tint, lavender border, no shadow | Secondary panels, empty states, nested content |
| `brand` | Purple gradient, white text | One featured/summary card per view at most |

- `interactive` adds hover shadow, purple border and a focus ring. Use it only when the whole card is one link or button.
- `size="sm"` tightens padding for dense lists.
- Padding is `--card-pad` (20px, 24px on desktop). Do not override padding per page.

Recipes (composition, not separate components yet):

- **Stat card:** `CardDescription` (label) + `CardTitle` with `type-stat` (value) + optional small `Badge`/trend text.
- **Announcement:** title, `Badge` (category), date in `type-caption`, 2-3 line excerpt, link.
- **Result summary:** session and term as `CardDescription`, overall result as `type-stat`, status `Badge`, action link.
- **Person (student/teacher):** avatar/initials, name (`type-card-title`), identifier (admission/staff number) in `type-caption`.
- **Action / portal option:** icon, title, one-line description; `interactive`.

---

## 10. Navigation (visual requirements only; nothing built yet)

### Public website

- **Items:** Home, About, Academics, Admissions, News & Events, Contact, plus a prominent **Visit the Portal** button.
- **Desktop (lg+):** white header, logo left, links centred or right in `type-label`, current page marked by a purple
  underline/weight (and `aria-current="page"`), "Visit the Portal" as a **primary** button at the far right.
- **Tablet/mobile (< lg):** logo + "Visit the Portal" stay visible; links move into a menu button that opens a `Sheet`
  (full-height, 44px rows). The menu button has a visible label or `aria-label` and `aria-expanded`.
- Header is sticky with `shadow-sm` once the page scrolls. Include a "Skip to main content" link as the first focusable element.
- Footer: light lavender (`surface-subtle`) background, same links, contact details; no heavy purple block.

### Portal (role-specific)

| Role | Items |
|---|---|
| Student | Dashboard, My Profile, Check Result, Announcements, Logout |
| Teacher | Dashboard, Upload Results, My Students, Uploaded Results, Announcements, Logout |
| Admin | Dashboard, Students, Teachers, Classes, Subjects, Results, Announcements, Settings, Logout |

- Items come from one config per role, rendered by one shared sidebar component. Roles differ only by data.
- Each item: 20px icon + `type-label` text, 44px row height, 8px radius. **Active:** lavender background
  (`sidebar-accent`), deep-purple text, 3px purple indicator on the left, `aria-current="page"`. **Hover:** `muted` background.
- **Logout** is separated at the bottom of the list (divider), is a real button (it changes state), and never looks like a nav link.
- Navigation is only convenience: access is enforced on the server (see ARCHITECTURE.md).

---

## 11. Dashboard design language

Layout (desktop >= 1024px):

```
+-----------+--------------------------------------------------+
| Sidebar   | Top header: menu/search (optional) . notifications . user menu
| 256px     +--------------------------------------------------+
| white,    | Breadcrumb (only when depth > 1)
| border-r  | Page title (h1, type-page-title) + page actions (right)
|           | Summary cards  (grid-cards, 1-4 columns)
|           | Main content cards / tables
+-----------+--------------------------------------------------+
```

- **Sidebar:** fixed on desktop; below `lg` it is hidden and opened from a menu button in the header as a left `Sheet`. It closes after navigation and traps focus while open.
- **Top header:** 64px, white, bottom border; contains menu button (mobile), user menu, optional search.
- **Page header:** breadcrumb above, `h1` below, primary page action aligned right (stacks below the title on mobile).
- **Content width:** `page-container` inside the main area; vertical flow with `stack-page`.
- **Summary cards:** at most 4 across; number first, label second, no decoration.
- **Tables:** `Table` inside its bordered container; header row on `surface-subtle`; right-align numbers; row actions as ghost buttons; on mobile either scroll horizontally with the first column pinned, or switch to a stacked "card per row" layout when there are more than ~4 columns. Always include pagination for long lists and a visible total count.
- **Empty states:** `subtle` card, centred icon, one-sentence explanation of *why* it is empty, one clear next action. No cartoons.
- **Loading states:** `Skeleton` shapes matching the final layout (no spinner-only pages); use a `Button loading` for in-flight actions.
- **Error states:** `Alert variant="destructive"` with what happened and what to do; page-level failures get an error boundary with a retry button.
- **Success notifications:** a toast for transient confirmations (add `sonner` when first needed) with icon + text, auto-dismiss ~5s, `role="status"`; persistent confirmations use `Alert variant="success"`.
- **Mobile:** single column, 16px gutters, stat cards 1-2 across, tables as described above, primary action full-width at the bottom of forms, sticky action bar for long forms.

---

## 12. Result design (future)

Results are the most important screen; they must be calm, readable and printable.

**Result summary header** (a `default` card, or `brand` when it is the featured item):

- Student name and admission number
- Academic session (e.g. 2026/2027) and term as clearly labelled fields: "Session", "Term"
- Class
- Publication status `Badge` (section 13)
- Overall figures (total, average, position when available) in `type-stat`

**Subject result table:**

| Subject | CA | Exam | Total | Grade | Remark |
|---|---|---|---|---|---|

- Subject left-aligned; numeric columns right-aligned, tabular figures; grade centred in a bold `type-label`.
- **Score:** plain number, never colour-coded alone. **Grade:** letter in a small neutral/`secondary` badge; do not use red/green for grades (a failing grade is communicated by the word in *Remark*, not hue).
- **Remark:** plain text (`Excellent`, `Pass` ...), left-aligned, wraps on small screens.
- Zebra striping is off; use hairline row borders. Row height 48px.
- **Mobile (< md):** each subject becomes a stacked block: subject name and Grade on the first line, then labelled "CA / Exam / Total / Remark" pairs (the table's columns become `dt`/`dd` pairs). Do not rely on horizontal scrolling for the main result.
- Use real `<table>` semantics on desktop (`<th scope="col">`), with a visible `<caption>` or `aria-label`.
- Print/PDF later: white background, no shadows, borders in `border` colour, same hierarchy.

**Unpublished state:** when a result is not published the student sees a single `subtle` card with the clock icon, the
title **"Result Upload in Progress"** and a short explanation. No partial numbers, no skeleton hints of scores.

---

## 13. Status badges

Component: `Badge` (soft variants). **Every status badge = icon + text label.** Colour supports the meaning; it never carries it alone.

| Status | Variant | Icon (lucide) | Label | Meaning |
|---|---|---|---|---|
| Draft | `neutral` | `PencilLine` | Draft | Being prepared by a teacher |
| Submitted | `info` | `Send` | Submitted | Awaiting admin review |
| Published | `success` | `CheckCircle2` | Published | Visible to the student |
| Upload in Progress | `warning` | `Clock` | Upload in Progress | What a student sees while their result is not published |

Other uses: `secondary` for categories/tags (e.g. announcement type), `destructive` for rejected/suspended/failed,
`outline` for low-emphasis metadata. Badges are never the only way to find out something important: pair with text elsewhere.

---

## 14. Responsive breakpoints

Mobile-first: write the phone layout first, then add `md:` / `lg:` / `2xl:` overrides.

| Name | Min width | Tailwind | Behaviour |
|---|---|---|---|
| Mobile | 320px | (default) | Single column, 16px gutters, sheet navigation, stacked tables/forms |
| Large phone / small tablet | 640px | `sm:` | 24px gutters, 2-column card grids |
| Tablet | 768px | `md:` | Controls drop to 40px / 14px text; 2-3 column grids; forms may use 2 columns |
| Desktop | 1024px | `lg:` | Persistent sidebar, 32px gutters, 3-4 column grids, tables full width |
| Wide | 1280px | `xl:` | Content capped at 1280px (`--container-page`) |
| Large desktop | 1440px | `2xl:` | Same capped width, more breathing room; do not stretch content further |

Rules: test at 320, 375, 768, 1024 and 1440. Nothing may scroll horizontally except a table inside its own
container. Do not simply shrink desktop layouts: restructure (stack, switch table to blocks, move nav into a sheet).
Prefer `grid-cards` (auto-fill) over hand-written column counts. Use `pointer-coarse:` for touch-specific sizing.

---

## 15. Accessibility rules

Target: **WCAG 2.2 AA.**

- **Keyboard:** everything reachable and operable by keyboard in a logical order; no keyboard traps (sheets/menus trap focus only while open and return it on close). Provide a "Skip to main content" link.
- **Focus:** always visible. Buttons: 2px outline + 2px offset. Inputs: purple border + ring. Never `outline: none` without a replacement.
- **Contrast:** text >= 4.5:1 (large text >= 3:1); control borders and focus indicators >= 3:1. Re-measure after palette changes (section 2).
- **Semantics:** landmarks (`header`, `nav`, `main`, `footer`), one `h1`, ordered headings, real `<table>`/`<th>`, lists for lists, `aria-current="page"` on active nav.
- **Forms:** real labels, `aria-invalid` + `aria-describedby` for errors, errors announced (`role="alert"`), required fields stated in text.
- **Buttons vs links:** `<button>` for actions, `<a>`/`Link` for navigation; inline links are always underlined (`text-link`); never a `<div onClick>`.
- **Status and feedback:** never colour alone: icon + text for badges, alerts, errors; async updates use `role="status"` / `role="alert"`.
- **Touch targets:** minimum 44x44px on touch devices (buttons, inputs, nav rows, checkbox/radio hit areas).
- **Motion:** animations are short and respect `prefers-reduced-motion` (global rule in globals.css; spinners use `motion-reduce:animate-none`).
- **Images and icons:** meaningful images have alt text; decorative icons get `aria-hidden="true"`; icon-only buttons get `aria-label`.
- **Zoom/reflow:** usable at 200% zoom and 320px width without loss of content.
- **Language:** `<html lang="en">` is set.

---

## 16. Component usage rules

1. **Start from shadcn/ui.** Add components with `npx shadcn@latest add <name>`, then style through the tokens. Do not hand-roll a component that shadcn already provides.
2. **Tokens, not values.** No hex codes, no raw `violet-*`/`gray-*`/`red-*` classes, no arbitrary pixel values for colour, radius or shadow in feature code. Need a new colour? Add a semantic token in globals.css, document it here.
3. **Customise at the source.** Visual changes to a base component are made once in `src/components/ui/*`, not overridden page by page. `className` overrides are for layout (width, margin), not appearance.
4. **No page-specific styling in the system.** Page layout uses `page-container`, `page-section`, `stack-page`, `stack-form`, `grid-cards`. Feature components live in `src/components/<feature>/` and compose `ui/` components.
5. **One primary button per view.** Destructive actions are never the visually dominant action and always confirm.
6. **Typography via `type-*` utilities**, not ad-hoc `text-xl font-bold` combinations.
7. **Presentational components receive props, not data access.** They never call the database or read the session (see ARCHITECTURE.md).
8. **Status = icon + text.** Never introduce a status that relies on colour alone.
9. **Keep `ui/` generic.** Domain words (student, result) belong in feature components. The status mapping in section 13 is the contract; the first feature that needs it builds `components/results/`.
10. **Document additions.** New token, utility or variant: update this file in the same change.
11. **Not yet added (add when first needed, not before):** `sonner` (toasts), `sidebar`, `dialog`/`alert-dialog`, `dropdown-menu`, `tabs`, `tooltip`, `breadcrumb`, `pagination`, `avatar`, dark mode.

### How a future page uses the system

```tsx
// src/app/portal/(protected)/student/results/page.tsx  (illustrative only)
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { CheckCircle2Icon } from "lucide-react"

export default async function Page() {
  const data = await getStudentResultSummaries() // DAL call, authorization inside
  return (
    <div className="stack-page">
      <h1 className="type-page-title">My results</h1>
      <div className="grid-cards">
        {data.map((r) => (
          <Card key={r.termId} interactive>
            <CardHeader>
              <CardDescription>{r.session}</CardDescription>
              <CardTitle>{r.term}</CardTitle>
              <Badge variant="success"><CheckCircle2Icon /> Published</Badge>
            </CardHeader>
          </Card>
        ))}
      </div>
    </div>
  )
}
```

The page contains no colours, no spacing values and no business logic: only layout utilities, `ui/` components and a DAL call.
