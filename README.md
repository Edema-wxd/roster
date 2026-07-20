# Roster

A private web app for keeping track of the people you're close to — where each partner is in her cycle, when you're seeing her, and the small things worth remembering — all on one calendar.

Each account has its own **completely private** roster; sign-ups don't share data. It's built for personal use (a handful up to ~20 tracked partners), not as a clinical or multi-tenant product.

> **Docs:** [`Project.md`](./Project.md) is the scope + current implementation status (the source of truth for "what works"). [`Design.md`](./Design.md) is the visual/UX guide and the record of design decisions. Read both before making changes. [`AGENTS.md`](./AGENTS.md) notes that this is a newer Next.js than your training data — check `node_modules/next/dist/docs/` when in doubt.

## What it does

- **First-run onboarding** — a guided setup for new accounts: add your first partner and (optionally) log her last period, so predictions work from day one.
- **Calendar** (home) — a month/week calendar marking each partner's **period** and **fertile window** days, plus a "Coming up" panel of upcoming visits and imminent cycle events. Log visits, appointments, and intimacy per day; get flagged when a visit lands on someone's period.
- **Partners** — a card per partner with a **cycle dial** (where she is right now), her current phase, next period, and care notes (allergies, food preferences).
- **Trends** — a period-timeline ribbon across everyone on one axis, and per-partner "how regular is her cycle" stat tiles.
- **Predictions** — next period, ovulation/fertile window, and phase, adaptively estimated from logged history (all editable).
- **Feedback** — a small backlog for notes about the app itself.

## Tech stack

- **[Next.js](https://nextjs.org) 16** (App Router, React 19) — UI + API routes + Server Actions in one codebase.
- **[Prisma](https://prisma.io) 7** over **PostgreSQL** on **[Neon](https://neon.tech)** — via the `@prisma/adapter-pg` driver adapter (Prisma 7 no longer reads `DATABASE_URL` implicitly; see `src/lib/prisma.ts`).
- **Auth** — custom: identifier (email/username) + a 4–6 digit PIN hashed with Node's built-in `scrypt`, and a signed-cookie session. No auth library. Per-account data isolation via `ownerId` + server-side ownership checks (`src/lib/authz.ts`).
- **Styling** — Tailwind v4 with a brand palette as CSS variables, [shadcn/ui](https://ui.shadcn.com) on `@base-ui/react` primitives, `lucide-react` icons, Geist (body) + Fraunces (display) via `next/font`. Manual light/dark theme toggle.
- **Data-viz** — hand-built (no chart library).

## Getting started

Requires Node 20+ and a PostgreSQL connection string (Neon or any Postgres).

```bash
npm install
```

Create a `.env` in the project root:

```bash
# Postgres connection string (Neon or local)
DATABASE_URL="postgresql://user:password@host/db?sslmode=require"
# Secret for signing session cookies — any long random string
AUTH_SECRET="..."
```

Generate the Prisma client and start the dev server:

```bash
npx prisma generate
npm run dev
```

Open [http://localhost:3000](http://localhost:3000), create an account, and the onboarding flow will walk you through adding your first partner.

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start the dev server |
| `npm run build` | Production build |
| `npm start` | Serve the production build |
| `npm run lint` | ESLint |

## Project layout

```
src/
  app/
    (app)/            authenticated area (shared header/nav)
      dashboard/      the Calendar (home)
      people/         Partners list + [id] detail
      trends/         timeline ribbon + regularity tiles
      feedback/       product-feedback board
    onboarding/       first-run setup flow
    login/ signup/    public auth pages
    api/auth/         login, signup, logout, set-pin routes
  components/         Calendar, PartnerCard, CycleRibbon, RegularityCard, ui/ (shadcn), …
  lib/               prisma, auth, authz, session, prediction, cycle, personPalette
prisma/schema.prisma  data model (User, Person, Cycle, Visit, IntimacyEntry, Feedback, …)
```

## Status & caveats

Runs locally against a live Neon database; **not deployed**. The database is currently ahead of the committed Prisma migration history (recent schema changes were applied via `db push`/direct SQL), so `prisma migrate dev` will want to reset — add columns surgically (`ALTER TABLE` + `prisma generate`) until the migration history is reconciled. See `Project.md` §12 for the full list of what's done, what's rough, and the auth/deployment caveats (e.g. no PIN-reset flow yet).
