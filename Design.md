# Design Guide

Companion to `Project.md`. Covers visual language and UI conventions for this app — read this before building or touching any component.

## 1. Component & Icon Conventions (required — see `AGENTS.md`)

- **Icons:** `lucide-react` and `react-icons` only. No emoji, ever — not as markers, not as decoration, not in placeholder copy.
- **Components:** shadcn/ui for anything that maps to a standard primitive (button, input, select, dialog, checkbox, popover, calendar cell chrome, etc.). Hand-build only what's genuinely custom to this app (e.g. the cycle-phase calendar grid itself, person color swatches).

**Status:** `lucide-react`, `react-icons`, and shadcn/ui (`components.json`, `src/components/ui/`) are installed and wired into `globals.css`'s token system. The calendar's former emoji markers (📅/❤️) and `✕` text-glyph delete buttons are now `lucide-react` icons. Note this repo's shadcn is on `@base-ui/react` primitives, not Radix (`DialogTrigger`/`DialogPrimitive.*` etc. come from `@base-ui/react/dialog`, `SelectPrimitive` from `@base-ui/react/select`); check `src/components/ui/*.tsx` directly for the actual prop shapes rather than assuming Radix-shadcn APIs from training data — the `value`/`onValueChange` (Select) and `checked`/`onCheckedChange` (Checkbox) prop names do match Radix-shadcn, though.

`AddPersonForm`, `PersonDetailsForm`, and `CycleLog` have been migrated onto shadcn `Input`/`Select`/`Checkbox`/`Label`/`Textarea`/`Button` primitives — no more hand-rolled Tailwind form fields in those three files. The visit details/edit dialog (`VisitEntry` in `Calendar.tsx`) separately adopted `Dialog`/`Select`/`Label`/`Textarea`/`Button`. `Calendar.tsx`'s day-grid layout and phase-dot rendering stay custom — that's the one genuinely bespoke piece of UI in the app; its day-detail sidebar's remaining plain forms (`VisitForm`/`CycleForm`/`IntimacyForm`, the `<select>`/`<input>` pairs still using `FIELD_CLASS`) are the one place shadcn migration is still open — convert opportunistically next time those are touched, no need for a big-bang rewrite.

## 2. Brand Palette

Defined as CSS variables in `src/app/globals.css`, exposed as Tailwind theme colors (`bg-primary`, `text-foreground`, etc.). Light/dark is controlled by a `data-theme="light"|"dark"` attribute on `<html>` — not a `prefers-color-scheme` media query — so the header's `ThemeToggle` can override the OS preference. See §6.

| Name  | Hex       | Role                                                          |
|-------|-----------|----------------------------------------------------------------|
| Cream | `#F5E9E2` | Light-mode background                                          |
| Blush | `#E3B5A4` | Secondary accent                                                |
| Rose  | `#D44D5C` | Accent (light mode), dark-mode primary                         |
| Wine  | `#773344` | **Primary** (light mode) — buttons, headings, active states    |
| Ink   | `#160029` | Dark-mode background, light-mode text                          |

Semantic tokens (`--background`, `--foreground`, `--primary`, `--secondary`, `--accent`) remap between light and dark automatically — components should reference the semantic token (`bg-primary`), never the raw brand color name (`bg-wine`), so dark mode stays correct without per-component overrides.

Primary was set to **Wine** (not Rose, the original default) after comparing both live in-browser — a validated call, don't relitigate it without a reason.

## 3. Person Palette (calendar coding)

Deliberately **separate** from the brand palette above — brand colors sit too close together in hue/lightness to tell 10–20 people apart at a glance on the calendar.

`src/lib/personPalette.ts` defines a fixed, colorblind-safe 12-color set (Okabe-Ito style):

`#E69F00` `#56B4E9` `#009E73` `#F0E442` `#0072B2` `#D55E00` `#CC79A7` `#999999` `#66C2A5` `#FC8D62` `#8DA0CB` `#E78AC3`

`getNextPersonColor(usedColors)` auto-assigns the next unused color to a new person, cycling once all 12 are taken (app is expected to scale to 5–20+ people, see `Project.md` §10). Never hand-pick a person color from the brand palette — always go through this module so the set stays distinguishable at scale.

## 4. Typography

`--font-sans` (Geist) and `--font-display` (Fraunces) are wired via `next/font` in `layout.tsx` and mapped in `globals.css`'s `@theme inline` block; `html { @apply font-sans; }` in `@layer base` applies Geist app-wide by default. Fraunces (`font-display`) is used narrowly — see §5.

## 5. Redesign Direction (v2 — in progress)

Follow-up to a UI/UX review: the app currently reads as a generic scheduling-SaaS template (`rounded-full` pills, `rounded-2xl` cream cards, uniform Geist weight, a bolted-on rainbow phase-color legend on the calendar) rather than something built for its actual subject — a private, single-admin instrument for tracking the cycles and schedules of people you're close to. This section documents the direction and why, before execution, so the "why" survives past this session.

**Color — phase ramp becomes part of the brand system, not a separate palette.**
Previously `PHASE_COLOR` in `Calendar.tsx` used four unrelated hues (rose/emerald/amber/periwinkle) purely for dot-legibility, disconnected from the Cream/Blush/Rose/Wine/Ink brand palette in §2. New approach: phase is encoded by **lightness within the wine/rose hue family** (menstrual = Wine, ovulation = Rose, luteal = Blush, follicular = hollow/outline on Cream) plus **fill-vs-outline** as a second channel — so the calendar reads as one coherent system instead of brand-colors-plus-a-random-legend. Person identity keeps the existing colorblind-safe Okabe-Ito ring border (§3) — that channel already works and isn't being touched. Distinguishing phase by lightness+fill rather than hue also keeps it legible for colorblind users without needing four maximally-distinct hues.

**Type — a display face earns its keep on dates and names.**
Geist stays for body copy, forms, and buttons (neutral, already wired, no reason to replace it). Adding **Fraunces** (`next/font/google`, variable, warm/characterful serif with optical sizing) as `--font-display`, used narrowly: the "Roster" wordmark, page H1s, the calendar month heading, and day numbers/person names inside the calendar. The two things you actually scan for on this page — dates and names — get a bit of visual weight; everything else stays quiet.

**Calendar — the signature element.**
The calendar is the entire reason this app exists and was previously the least-designed part of it (bare grid + tiny dots + a caption sentence explaining the encoding). Scope decision: rebuild the day-cell visual system (new phase ramp, larger/clearer markers, no more explanatory sentence — the key becomes a compact visual legend instead of prose) rather than a full custom per-cell SVG phase-wheel. A phase-wheel per cell (42 cells × up to 12 people) was considered and deliberately cut for engineering cost and glance-legibility risk at the 5–20+ person scale this app targets (§10) — revisit only if the simpler version proves insufficient in real use.

**Copy — replace placeholder-grade strings with the app's own voice.**
"Cycle tracking and scheduling, in one place," empty states like "No one to track yet," and generic button labels get a pass. Keep it plain and specific (§ writing guidance: active voice, name what the person controls, no filler) — not clever, just less templated.

**Explicitly not touched in this pass:** the day-detail sidebar's remaining plain forms (`VisitForm`/`CycleForm`/`IntimacyForm` in `Calendar.tsx`) — still tracked in §1's migration plan, orthogonal to this visual redesign and left for next time those are opportunistically touched. (`AddPersonForm`, `PersonDetailsForm`, `CycleLog` have since been migrated onto shadcn — see §1.)

## 6. Theming (light/dark + manual switch)

Dark mode was originally a `prefers-color-scheme` media query in `globals.css` — this had no way to let a person override their OS setting, and the `.dark`-class rules added alongside it (for future shadcn `dark:` utilities) never actually activated since nothing ever added a `.dark` class. Fixed by switching to the pattern in `node_modules/next/dist/docs/01-app/02-guides/preventing-flash-before-hydration.md` ("Themes" section — read this before touching theming again, since this Next version's docs are the source of truth per `AGENTS.md`):

- **Single source of truth**: a `data-theme="light"|"dark"` attribute on `<html>`. `globals.css` has light values in `:root` and overrides in `[data-theme="dark"]` — no media query. `@custom-variant dark` targets `[data-theme="dark"]` so any shadcn `dark:` utility classes resolve correctly too.
- **No flash on load**: `layout.tsx` renders `<html data-theme="light" suppressHydrationWarning>` as the SSR default, then an inline `<script>` in `<head>` runs synchronously during HTML parsing (before first paint) to read `localStorage.theme`, fall back to `matchMedia("(prefers-color-scheme: dark)")` if unset, and set the real `data-theme` before the browser paints anything. `suppressHydrationWarning` tells React to accept the DOM the script already produced instead of flagging a mismatch.
- **The switch**: `src/components/ThemeToggle.tsx`, a small icon button (`Moon`/`Sun` from lucide-react) built on `useSyncExternalStore` reading the same `localStorage`-then-`matchMedia` source (React's sanctioned way to read external mutable state without a hydration mismatch — a lazy `useState` + `useEffect` was tried first but triggers the `react-hooks/set-state-in-effect` lint rule and doesn't reliably catch same-tab writes). On click it sets `data-theme` and `localStorage.theme` directly and dispatches a custom event so the store re-syncs — `storage` events only fire in *other* tabs, not the one that made the change. Rendered in the authenticated app header (`src/app/(app)/layout.tsx`) and top-right on the three standalone public pages (`/`, `/login`, `/signup`), since they don't share a layout component.
- **The `--surface` token**: every form field, calendar panel, and card had been hardcoded as raw Tailwind `bg-white`/`bg-cream` rather than a semantic token — invisible as a bug in light mode (white/cream-on-cream is a subtle, plausible-looking tint) but broke badly in dark mode (bright white/cream panels stacked on the ink background). Fixed by adding `--surface` (white in light, `#2b1245` in dark) for inner surfaces like inputs, and reusing the existing `--card` token (previously identical to `--background` in dark mode — no elevation at all) for panel-level containers, now also `#2b1245`. All `bg-white`/`bg-cream` call sites were swapped to `bg-surface`/`bg-card`. Raw `text-wine`/`bg-wine` on top of these surfaces was also swapped to `text-primary`/`bg-primary` in a few spots (dashboard reminder banner, a CycleLog link, the phase-label chip in `PersonDetailsForm`) — wine-on-ink has poor contrast in dark mode, while `--primary` correctly resolves to Rose there.
- **`color-scheme`**: `html` declares `color-scheme: light`, overridden to `dark` under `[data-theme="dark"]`. Without this, the browser renders native form-control chrome (`<select>` popups, checkbox/radio widgets, scrollbars, text-input caret) using its own guess based on the OS preference — independent of our `data-theme` — so an explicit "light" choice on a dark-OS machine (or vice versa) could still produce illegible UA-default text/background pairings inside inputs, even though the token system itself was correct. Every raw `<input>`/`<select>`/`<textarea>` that was missing an explicit `text-foreground` (most of them — Tailwind's preflight sets `color: inherit`, which was usually enough, but wasn't 100% of the way there) got it added directly, matching the `FIELD_CLASS` convention already used in the calendar sidebar.

## 7. Layout Conventions

- Dashboard is calendar-first: the month calendar takes the majority of the page, with a right-hand side panel for the selected day's detail (visits, intimacy entries) — don't shrink the calendar to make room for secondary content.
- Forms (`AddPersonForm`, `CycleLog`) use inline expand/collapse ("+ Add" toggles a form section) rather than modals/dialogs for the primary add flows — the visit-edit flow has since moved to a shadcn `Dialog` (§1); the add-flows haven't, and don't need to.

## 8. Responsive / Mobile

Checked at 375px (real mobile viewport, not just a narrow desktop window — Chrome's default automation window floors around 500 CSS px and silently hides overflow that only shows up narrower). The `Calendar` top-level split (`flex flex-col lg:flex-row`) already stacked correctly below `lg`, and the migrated forms' `flex-col sm:flex-row` field rows already stacked cleanly — those didn't need changes.

What did break: the app header (`src/app/(app)/layout.tsx`) was a single `flex items-center justify-between` row with no wrap — at 375px the "Log Out" pill ran out of room and wrapped its own text mid-word instead of the row wrapping. Fixed by making the header row and its two inner groups `flex-wrap` (`gap-x-* gap-y-*` instead of a single `gap-*`, tighter `px-4 py-3` below `sm:`) and adding `whitespace-nowrap` to `LogoutButton` so the pill itself never breaks, only the row does. Same pattern (`flex-wrap` on the row, `whitespace-nowrap` on the atomic pill/button contents) is the thing to reach for if another cramped-row case turns up — don't reach for a hamburger menu or a second desktop-only layout for a 3-link nav.
