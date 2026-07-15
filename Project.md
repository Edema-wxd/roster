# Multi-Partner Cycle & Scheduling Tracker — Project Scope

**Status:** In active development. Next.js app scaffolded, Prisma schema live on Neon, and a working v1 slice is built: sign up, log in, dashboard calendar, people management, cycle logging, and visit/intimacy logging. See §12 for exactly what's implemented vs. still open.

## 1. Purpose

A private, single-admin web app for tracking the menstrual cycles of multiple partners, and using that data to plan visits/dates and manage appointments — all in one unified calendar.

## 2. Users & Roles

- **Admin (you)** — the only account for now. Full access to all tracked people, their cycle data, and the scheduling calendar.
- **Tracked people** — no login initially. Represented as records the admin manages (name, notes, contact info optional). Self-login for tracked people is a **future enhancement**, not in v1.
- Data model should anticipate a future "invited user" role per person without requiring a rebuild (see §6).

## 3. Core Data Model

Implemented in `prisma/schema.prisma`, migrated to Neon.

**AdminUser** *(implemented)*
- `identifier` (email or access-code string, unique) — the single admin identity created via sign up.

**Person** *(implemented)*
- name, color (for calendar coding), notes, active/archived status (`isActive`)
- `allergies`, `foodPreferences` — free-text fields, separate from general notes
- `defaultCycleLength` / `defaultPeriodLength` (editable, used as the prediction baseline)
- `userId` (nullable) — reserved for future self-login per person (see §6)

**Cycle** *(implemented)* — one row per logged period, per person
- start date, end date (editable after the fact)
- `cycleLength`, `periodLength` — per-cycle overrides of the person's defaults, editable per entry
- flow intensity (light/medium/heavy)
- symptoms (free-text list) + notes
- basal body temp (optional), ovulation test result (optional), birth control/contextual notes

**Prediction** *(basic version implemented, adaptive weighting still open — see §12)*
- Currently: next period predicted from the most recent logged cycle's `cycleLength`/`periodLength` (falling back to the person's defaults), averaged over the last 6 cycles when per-cycle lengths are set.
- Manual override already available — cycle length/duration is editable both on the Person defaults and per logged Cycle.

**Visit / Appointment** *(implemented)*
- one or more people involved (join table `VisitPerson`), date, type (`VISIT` | `APPOINTMENT`), notes
- status field exists in schema (`PLANNED`/`CONFIRMED`/`DONE`/`CANCELLED`) but isn't yet surfaced in the UI
- conflict flag against predicted period days is **not yet built** (see §12)

**IntimacyEntry** *(implemented — added mid-build, not in the original spec)*
- person, date, `protected: boolean`, notes — logged directly from the calendar day panel, shown as a heart marker on the calendar.

## 4. Core Features (v1 — "build it right" scope)

1. **Person management** — add/edit/archive people, set defaults.
2. **Cycle logging** — log/edit past and current cycles with full symptom/health detail (§3).
3. **Adaptive predictions** — next period, fertile window, and confidence range per person; manual override of cycle length/duration.
4. **Unified calendar** — month/week view showing all people overlaid (color-coded), predicted cycle phases as shaded ranges, plus scheduled visits/appointments.
5. **Conflict/awareness flags** — visually flag when a planned visit lands on a predicted period day, so you can plan around it.
6. **Scheduling** — create/edit/cancel visits and appointments, per person or multi-person.
7. **History views** — per-person cycle history, symptom trends over time (simple charts).
8. **In-app reminders** — e.g. "Person X's period is predicted to start in 2 days" shown on login/dashboard (no push notifications in v1, since platform is web-only for now).

## 5. Explicitly Out of Scope for v1

- Native mobile app (web-only, responsive)
- Push/email notifications (revisit once PWA/native is considered)
- Multi-admin / shared household accounts
- Self-service login for tracked people
- HIPAA/clinical compliance tooling (not needed — personal/private use)

## 6. Privacy & Security

- Personal/private use tier: single admin identity (`AdminUser`), no per-request password — see §12 for how auth actually works today (deliberately lightweight, revisit before any real deployment).
- Data encrypted in transit (HTTPS in production) and at rest (Neon default).
- No third-party analytics/tracking on this app given data sensitivity.
- `Person.userId` (nullable) reserved from day one, so adding self-login later doesn't require a schema rework.

## 7. Recommended Tech Stack

- **Framework:** Next.js 16 (App Router, React 19) — single codebase for UI + API routes/Server Actions.
- **Database:** PostgreSQL on **Neon** — live connection configured in `.env` (`DATABASE_URL`), migrations applied.
- **ORM:** Prisma 7 — type-safe schema matching §3. Note: Prisma 7's new `prisma-client` generator requires an explicit driver adapter at runtime (`@prisma/adapter-pg`), it no longer reads `DATABASE_URL` implicitly inside `PrismaClient()`; see `src/lib/prisma.ts`.
- **Auth:** Custom lightweight identifier + signed-cookie session (see §12) — not NextAuth/Auth.js as originally suggested, since the "email or access code, no password" flow the app ended up with didn't need a full auth library.
- **Hosting:** Vercel (not yet deployed) + Neon Postgres (live).
- **Charts:** not yet added — still the plan for symptom/cycle trend views (§9).

## 8. Suggested Build Phases

1. **Foundation** — auth, data model, person CRUD. ✅ done
2. **Cycle logging** — log/edit cycles + symptoms, per-person history view. ✅ done
3. **Prediction engine** — basic version done (last-cycle + averaging); full adaptive/confidence-range model still open.
4. **Unified calendar** — overlay view, color coding, phase shading. ✅ done (month view; week view not built)
5. **Scheduling** — visits/appointments CRUD ✅ done; conflict flagging ❌ not built.
6. **Polish** — trend charts, in-app reminders, responsive/mobile pass. ❌ not started.

## 9. Open Questions / Remaining Work

- Exact symptom list / taxonomy (currently free-text comma-separated; no fixed taxonomy yet).
- Whether "appointment" needs any reminder/notification beyond in-app (e.g. eventually email).
- Symptom/cycle trend charts (Recharts or similar) — not built.
- Conflict flag when a visit lands on a predicted period day — not built.
- Week view for the calendar (currently month view only).
- Visit status (`PLANNED`/`CONFIRMED`/etc.) exists in the schema but has no UI yet — visits are created as `PLANNED` implicitly and not editable after creation (only deletable).
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

## 12. Current Implementation Status

**Live app structure**

- `/` — public home, links to Log In / Sign Up.
- `/signup` — public. Creates the single `AdminUser` row (blocked if one already exists) and logs the admin in immediately.
- `/login` — public. Enter the same email/access-code string set at sign up.
- `/dashboard` — protected. Full-width month calendar (majority of the page, per spec) with a right-hand side panel for the selected day: shows/logs Visits and Intimacy entries for that day, plus a person color legend.
- `/people` — protected. List of active people + "Add Person" inline form (name, color, default cycle/period length).
- `/people/[id]` — protected. Edit person details (name, color, cycle/period defaults, notes, allergies, food preferences) + cycle history list and "Log Cycle" form (start/end date, per-cycle cycle/period length override, flow intensity, symptoms, notes). Includes "Archive" (soft-delete via `isActive`).

**Auth model (deliberately lightweight — revisit before real deployment)**

- No password. `AdminUser.identifier` is any string (email or access code) chosen at sign up.
- Session is a signed HMAC cookie (`src/lib/session.ts`, secret from `AUTH_SECRET` env var) — no JWT library, no DB session table.
- `src/middleware.ts` gates every route except `/`, `/login`, `/signup`, and `/api/auth/*`.
- Important gotcha hit during the build: Prisma **cannot** be imported into `middleware.ts` (or anything it transitively imports) — the query engine doesn't bundle for the middleware runtime. Session verification (`session.ts`) is intentionally dependency-free (pure HMAC, no Prisma) so middleware stays lightweight; DB-backed identifier checks (`auth.ts`) are only used inside API routes.

**Calendar logic** (`src/lib/cycle.ts`, `src/components/Calendar.tsx`)

- Dates are handled as plain `YYYY-MM-DD` string keys throughout, deliberately avoiding timezone-sensitive `Date` conversions so a logged day means the same calendar day regardless of viewer timezone.
- Per person, per day: shows a solid dot for a logged period day, a faint dot for a predicted period day (next cycle = last cycle's start + its `cycleLength`, or the person's default).
- 📅 marker for scheduled visits/appointments that day, ❤️ marker for logged intimacy entries.
- Clicking a day selects it and opens "+ Visit" / "+ Intimacy" forms in the side panel; entries listed below are deletable inline.

**Known rough edges / not yet done**

- No adaptive/confidence-range prediction — just last-cycle-plus-average.
- No conflict flagging between visits and predicted period days.
- No trend charts, no in-app "period in N days" reminder banner yet.
- Visit `status` field unused in the UI.
- Not deployed — runs locally against the live Neon database only.
