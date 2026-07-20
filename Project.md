# Multi-Partner Cycle & Scheduling Tracker — Project Scope

**Status:** In active development. Next.js app scaffolded, Prisma schema live on Neon, and a working v1 slice is built: sign up, log in, dashboard calendar, people management, cycle logging, and visit/intimacy logging. See §12 for exactly what's implemented vs. still open.

## 1. Purpose

A private, multi-account web app for tracking the menstrual cycles of multiple partners, and using that data to plan visits/dates and manage appointments — all in one unified calendar. Each account has its own completely private calendar (§6) — this is not a shared household tool with multiple logins on one dataset.

## 2. Users & Roles

- **Account holder** — anyone who signs up (identifier + PIN, §6). Full access to their own tracked people, cycle data, and scheduling calendar — invisible to every other account.
- **Tracked people** — no login initially. Represented as records the account holder manages (name, notes, contact info optional). Self-login for tracked people is a **future enhancement**, not in v1 (this is `Person.userId`, a different concept from account ownership — see §6).
- Data model should anticipate a future "invited user" role per person without requiring a rebuild (see §6).

## 3. Core Data Model

Implemented in `prisma/schema.prisma`, migrated to Neon.

**User** *(implemented — renamed from `AdminUser` when the app moved to multiple accounts)*
- `identifier` (any string, email or username, unique across all accounts) + `pinHash` (scrypt, 4-6 digit PIN — see §6) — one row per account, each with its own private roster via `Person.ownerId`/`Visit.ownerId`.

**Person** *(implemented)*
- name, color (for calendar coding, auto-assigned from a fixed colorblind-safe palette — see §11), notes, active/archived status (`isActive`)
- `ownerId` (required) — the `User` account that manages this record; every query/mutation is scoped by this (see §6). **Not** the same field as `userId` below.
- `gender` (`WOMAN` | `MAN` | `OTHER`, default `WOMAN`) — informs the default for `cycleTrackingEnabled` at creation time but never hard-gates the UI on its own
- `cycleTrackingEnabled` (Boolean, default `true`) — defaulted from gender (`MAN` → `false`, else `true`), always overridable per person; all cycle-tracking screens/queries must check this flag rather than gender directly
- `allergies`, `foodPreferences` — free-text fields, separate from general notes
- `defaultCycleLength` / `defaultPeriodLength` / `defaultLutealPhaseLength` (all editable, used as the prediction baseline — luteal phase length defaults to 14 days and anchors ovulation back-calculation, see Prediction below)
- `userId` (nullable) — reserved for future self-login *by the tracked partner themself*, a different, unbuilt concept from `ownerId` above (see §6)

**Cycle** *(implemented)* — one row per logged period, per person
- start date, end date (editable after the fact)
- `cycleLength`, `periodLength` — per-cycle overrides of the person's defaults, editable per entry
- flow intensity (light/medium/heavy)
- symptoms (free-text list) + notes
- basal body temp (optional), ovulation test result (optional), birth control/contextual notes

**Prediction** *(implemented in `src/lib/prediction.ts`, pure functions, no adaptive weighting beyond stddev-based confidence yet)*
- Predicted cycle length = mean of gaps between the last up to 12 cycles' start dates (per-cycle `cycleLength` override wins where set); falls back to the person's `defaultCycleLength` with fewer than 2 logged cycles.
- Predicted variability = population stddev of those gaps, clamped to 2–7 days, defaulting to 3 days with insufficient history — currently computed but not yet surfaced as a UI confidence range (see §12).
- Full cycle phase windows are computed, not just the period window: predicted **menstrual**, **ovulation**, **luteal**, and **follicular** windows. Ovulation is back-calculated from the *next* predicted period start minus `defaultLutealPhaseLength`, since luteal length is far less variable than follicular length (the standard approach) — a ±1 day window around that anchor.
- Logged menstrual days always take priority over predicted ones (`phaseForDate`); `currentPhaseLabel` produces the "Day N — Phase" label shown on the person detail page.
- Manual override already available — cycle length/duration/luteal length is editable both on the Person defaults and per logged Cycle.

**Visit / Appointment** *(implemented)*
- one or more people involved (join table `VisitPerson`), date + optional time (`scheduledAt`), type (`VISIT` | `APPOINTMENT`), notes
- status (`PLANNED`/`CONFIRMED`/`DONE`/`CANCELLED`) is **implemented** — editable via a details/edit dialog opened from the day sidebar's visit list (`VisitEntry` in `Calendar.tsx`), alongside type, date/time, people, and notes. Cancelled visits render muted (struck-through, reduced opacity) rather than disappearing, so history stays visible.
- conflict flag against predicted/logged period days is **implemented** — `src/components/Calendar.tsx`'s `visitConflicts`/`menstrualPeopleOnKey` flag it in three places: while picking people in the "+ Visit" form, on already-scheduled visits in the day sidebar, and as a marker on the calendar day cell itself (see §12)

**IntimacyEntry** *(implemented — added mid-build, not in the original spec)*
- person, date, `protected: boolean`, notes — logged directly from the calendar day panel, shown as a heart marker on the calendar.

**User.onboardedAt** *(implemented)* — nullable timestamp on `User` gating the first-run onboarding flow (§12). Null = the account hasn't onboarded → `/onboarding` shows; set once finished/skipped.

**Feedback / FeedbackComment** *(implemented — added mid-build)* — a personal product-feedback backlog (message, optional 1–5 rating, `OPEN`/`IN_PROGRESS`/`DONE` status, threaded comments), surfaced at `/feedback`. **Deliberately not scoped by `ownerId`** — it's feedback about the app itself, a single shared list, not per-account data.

## 4. Core Features (v1 — "build it right" scope)

1. **Person management** — add/edit/archive people, set defaults.
2. **Cycle logging** — log/edit past and current cycles with full symptom/health detail (§3).
3. **Adaptive predictions** — next period, fertile window, and confidence range per person; manual override of cycle length/duration.
4. **Unified calendar** — month/week view showing all people overlaid (color-coded), predicted cycle phases as shaded ranges, plus scheduled visits/appointments.
5. **Conflict/awareness flags** — visually flag when a planned visit lands on a predicted period day, so you can plan around it.
6. **Scheduling** — create/edit/cancel visits and appointments, per person or multi-person.
7. **History views** — per-person cycle history, symptom trends over time (simple charts).
8. **At-a-glance "what's next"** — the dashboard day panel's "Coming up" section surfaces upcoming visits and imminent period/fertile windows across everyone (no push notifications in v1, since platform is web-only for now).

## 5. Explicitly Out of Scope for v1

- Native mobile app (web-only, responsive)
- Push/email notifications (revisit once PWA/native is considered)
- Multi-admin / shared household accounts
- Self-service login for tracked people
- HIPAA/clinical compliance tooling (not needed — personal/private use)

## 6. Privacy & Security

- **Multi-account, fully isolated**: each `User` account has a completely private roster — `Person.ownerId` and `Visit.ownerId` scope every list query, and every Server Action that mutates a specific record (by personId/cycleId/visitId/etc.) re-verifies ownership server-side via `src/lib/authz.ts` before touching it, rather than trusting the id alone. `Cycle`/`CycleDayLog`/`IntimacyEntry` are scoped transitively through their `Person`.
- **Login**: identifier (any string — email or username, case-insensitive) + a 4-6 digit numeric PIN, hashed with Node's built-in `scrypt` (`src/lib/auth.ts`) — no third-party auth library, no plaintext/reversible storage.
- Session is a signed HMAC cookie carrying the account's user id (`src/lib/session.ts`, secret from `AUTH_SECRET` env var) — no JWT library, no DB session table. See §12 for the full mechanics.
- Data encrypted in transit (HTTPS in production) and at rest (Neon default).
- No third-party analytics/tracking on this app given data sensitivity.
- `Person.userId` (nullable) reserved from day one, so adding self-login *for the tracked partner* later doesn't require a schema rework — this is separate from `Person.ownerId` (the account managing the record), see §3.

## 7. Recommended Tech Stack

- **Framework:** Next.js 16 (App Router, React 19) — single codebase for UI + API routes/Server Actions.
- **Database:** PostgreSQL on **Neon** — live connection configured in `.env` (`DATABASE_URL`), migrations applied.
- **ORM:** Prisma 7 — type-safe schema matching §3. Note: Prisma 7's new `prisma-client` generator requires an explicit driver adapter at runtime (`@prisma/adapter-pg`), it no longer reads `DATABASE_URL` implicitly inside `PrismaClient()`; see `src/lib/prisma.ts`.
- **Auth:** Custom identifier + PIN + signed-cookie session (see §12) — not NextAuth/Auth.js, since the "any string identifier, numeric PIN, multiple isolated accounts" flow the app ended up with didn't need a full auth library. PIN hashing uses Node's built-in `scrypt`, no bcrypt/argon2 dependency added.
- **Hosting:** Vercel (not yet deployed) + Neon Postgres (live).
- **Charts:** [Recharts](https://recharts.org) — `/trends` page (§12), combined cycle-day line chart and per-person cycle-length trend charts.

## 8. Suggested Build Phases

1. **Foundation** — auth, data model, person CRUD. ✅ done
2. **Cycle logging** — log/edit cycles + symptoms, per-person history view. ✅ done
3. **Prediction engine** — basic version done (last-cycle + averaging); full adaptive/confidence-range model still open.
4. **Unified calendar** — overlay view, color coding, phase shading, month/week toggle. ✅ done
5. **Scheduling** — visits/appointments CRUD ✅ done; conflict flagging ✅ done.
6. **Polish** — in-app reminders ✅ done; trend charts ✅ done; responsive/mobile pass ❌ not started.

## 9. Open Questions / Remaining Work

- Exact symptom list / taxonomy (currently free-text comma-separated; no fixed taxonomy yet).
- Whether "appointment" needs any reminder/notification beyond in-app (e.g. eventually email).
- Revisit the auth model (§12) before this app is ever exposed outside a trusted personal environment.

## 10. Scale Considerations

- Expected to grow to 5–20+ tracked people, so data model and UI (calendar overlay, person list/filtering) should be designed to stay usable at that scale rather than assuming a fixed handful.

## 11. Brand Palette

| Name  | Hex       | Role                                                   |
|-------|-----------|---------------------------------------------------------|
| Cream | `#F5E9E2` | Light-mode background                                   |
| Blush | `#E3B5A4` | Secondary accent                                         |
| Rose  | `#D44D5C` | Accent (light mode), dark-mode primary                   |
| Wine  | `#773344` | **Primary** (light mode) — buttons, headings, active states |
| Ink   | `#160029` | Dark-mode background, light-mode text                    |

Defined as CSS variables in `src/app/globals.css` (`--color-cream`, `--color-blush`, `--color-rose`, `--color-wine`, `--color-ink`) and exposed as Tailwind theme colors (`bg-primary`, `text-foreground`, etc.), with automatic light/dark swaps via `prefers-color-scheme`. Primary was set to **Wine** after comparing both options live in-browser (Rose was the initial default).

**Person palette (calendar coding)** — deliberately separate from the brand palette above, since brand colors are too close together to tell 10–20 people apart at a glance. `src/lib/personPalette.ts` defines a fixed, colorblind-safe 12-color set (Okabe-Ito style) and `getNextPersonColor()` auto-assigns the next unused color to a new person, cycling once all 12 are in use.

Full UI/design conventions (icon library, component library, typography, and known gaps against those conventions) live in `Design.md`.

## 12. Current Implementation Status

**Live app structure**

- `/` — public home, links to Log In / Sign Up.
- `/signup` — public. Any string identifier (email or username) + a 4-6 digit PIN — creates a new `User` account (no cap on how many) and logs in immediately.
- `/login` — public. Identifier + PIN. An account created before PIN login existed (the original single-admin row) has no `pinHash` yet — logging in with just the identifier prompts a one-time "set your PIN" step (`/api/auth/set-pin`) instead of comparing against nothing.
- `/dashboard` — protected. Full-width month/week-toggle calendar (majority of the page, per spec) with a right-hand side panel for the selected day: shows/logs Visits and Intimacy entries for that day, plus a person color legend. Flags when a visit lands on someone's period (logged or predicted).
- `/people` — protected. List of active people + "Add Person" inline form (name, color, default cycle/period length).
- `/people/[id]` — protected. Edit person details (name, color, cycle/period defaults, notes, allergies, food preferences) + cycle history list and "Log Cycle" form (start/end date, per-cycle cycle/period length override, flow intensity, symptoms, notes). Includes "Archive" (soft-delete via `isActive`).
- `/trends` — protected. A combined line chart showing every tracked person's day-of-cycle over time (`src/lib/prediction.ts`'s `cycleDayProgression`, sawtooth reset at each period start, extended past today with predicted future cycles) plus a small per-person cycle-length regularity chart (`cycleLengthHistory`).

**Auth model**

- Identifier (any string, case-insensitive) + 4-6 digit PIN, hashed with `scrypt` (`src/lib/auth.ts`) — one row per account in `User`, uniqueness enforced on `identifier`.
- Session is a signed HMAC cookie whose payload embeds the account's user id (`user.<id>.<timestamp>.<signature>`, `src/lib/session.ts`, secret from `AUTH_SECRET` env var) — no JWT library, no DB session table. `verifySessionToken` returns the user id (or `null`), not just a boolean, so Server Components/Actions can identify *which* account is calling.
- `src/lib/auth.ts`'s `requireUserId()`/`getCurrentUserId()` read that cookie (via `next/headers`'s `cookies()`) for use in Server Components and Server Actions; `src/lib/authz.ts` has the per-resource ownership checks (`assertOwnsPerson`, `assertOwnsVisit`, `assertOwnsCycle`, etc.) that every mutation calls before touching a record by id.
- `src/middleware.ts` gates every route except `/`, `/login`, `/signup`, and `/api/auth/*`. Unchanged by the multi-account work — it only verifies the cookie signature, doesn't need the embedded user id.
- Important gotcha hit during the build: Prisma **cannot** be imported into `middleware.ts` (or anything it transitively imports) — the query engine doesn't bundle for the middleware runtime. Session verification (`session.ts`) is intentionally dependency-free (pure HMAC, no Prisma) so middleware stays lightweight; DB-backed identifier/ownership checks (`auth.ts`, `authz.ts`) are only used inside Server Actions/Components.
- **Migration note**: `prisma/migrations/20260719142849_multi_user_ownership` renamed `AdminUser` → `User` (data preserved), added `pinHash`, and backfilled `Person.ownerId`/`Visit.ownerId` onto the single pre-existing account so nothing already tracked was lost when accounts became separate.
- **Error handling** (`/login`, `/signup`): `auth.ts` throws `AuthError` for anything safe to show verbatim (bad PIN format, taken identifier, unrecognized account) — everything else (a DB hiccup, etc.) is caught by the shared `toClientError()` helper, logged server-side via `console.error`, and replaced with a generic "Something went wrong" message so internal detail never reaches the client. Login deliberately returns the *same* "isn't right" message whether the identifier doesn't exist or the PIN is wrong (no account-enumeration via error text). Signup also catches the Prisma P2002 unique-constraint error from a same-identifier signup race (two requests both passing the pre-check before either commits) and reports it as the same friendly "already taken" message. Both auth pages guard against double-submit, clear the PIN field(s) after any failed attempt, wrap `fetch` in try/catch for offline/network failures, and render the error with `role="alert"` in `text-destructive` (previously `text-primary`, which doesn't read as an error color).

**Calendar logic** (`src/lib/cycle.ts`, `src/components/Calendar.tsx`)

- Dates are handled as plain `YYYY-MM-DD` string keys throughout, deliberately avoiding timezone-sensitive `Date` conversions so a logged day means the same calendar day regardless of viewer timezone.
- Per person, per day: shows a solid dot for a logged period day, a faint dot for a predicted phase day, using the full phase model from `src/lib/prediction.ts` (menstrual/ovulation/luteal/follicular), not just a period on/off flag.
- Scheduled visits/appointments and logged intimacy entries are marked with `lucide-react` icons (`CalendarDays`/`Stethoscope`, `Heart`); a visit that lands on someone's period shows an `AlertTriangle` marker too (`visitConflicts` in `Calendar.tsx`).
- Month/week toggle: `buildWeekCells`/`startOfWeekKey` in `Calendar.tsx` build a single-row 7-day grid sharing the same day-cell rendering as the month grid; switching views re-anchors on the currently selected day.
- Clicking a day selects it and opens "+ Visit" / "+ Intimacy" / "+ Cycle" forms in the side panel; entries listed below are deletable inline.

**Known rough edges / not yet done**

- Prediction variability (stddev-based confidence range) is computed in `src/lib/prediction.ts` but not yet surfaced in the UI as a visible range/confidence indicator.
- In-app "period in N days" reminder banner is built (dashboard, within a 5-day window) — no email/push notifications, which remains out of scope for v1 (§5).
- shadcn migration for `AddPersonForm`/`PersonDetailsForm`/`CycleLog` still pending — see `Design.md` §1.
- The original single-admin account hasn't set a PIN yet — the next login for that identifier will hit the "set your PIN" step (see §12) rather than a plain PIN prompt. No action needed from here, just don't be surprised by it.
- No PIN-reset flow if a PIN is forgotten — matches this app's existing "no recovery" reality, revisit before real deployment.
- **First-run onboarding** (`src/app/onboarding/`) — a standalone, skippable flow shown once per account: Welcome → add first partner → (optional) log her last period → done → calendar. It reuses the owner-scoped `addPerson`/`addCycle` server actions, so the created data lands in the signed-in account's private roster. Gated by `User.onboardedAt`: signup redirects to `/onboarding`; the dashboard redirects first-timers there too; finishing or skipping sets `onboardedAt` (via `completeOnboarding`), after which `/onboarding` always bounces to `/dashboard`. Existing accounts were backfilled to a non-null `onboardedAt`, so only fresh sign-ups ever see it.
- **Migration drift gotcha** — the DB is currently ahead of the committed migration history (the multi-user + Feedback work was applied via `db push`/direct SQL, not migrations). Because of that, `prisma migrate dev` wants to **reset** (destructive) rather than diff cleanly. The `User.onboardedAt` column was therefore added with a direct `ALTER TABLE` + backfill, and `prisma generate` re-run — it is in `schema.prisma` but has **no migration file**. Before any real deploy, someone should reconcile the whole migration history against the live schema in one pass; until then, add columns surgically (ALTER + `prisma generate`), never `migrate dev`.
- Not deployed — runs locally against the live Neon database only.
