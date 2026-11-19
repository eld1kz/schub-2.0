# CLAUDE.md — Schub

## What this is
Schub is a social network for student builders: find teammates for hackathons,
competitions and projects. Students browse opportunities, say they're looking for a
team, post teams with open roles and apply to them, get matched with people whose
skills complement theirs, and connect.

The repo has two apps on the same Supabase project:
- `web/` — the Next.js app. **This is where active work happens.**
- Repo root (`Views/`, `ViewModels/`, `Services/`, `Models/`, `Components/`) — the
  original SwiftUI iOS app. Not being developed right now; the iOS rules at the
  bottom of `~/CLAUDE.md` apply only when working there.

## Web stack
- Next.js 16 (App Router, Cache Components), React 19, TypeScript, Tailwind CSS 4
- Supabase: Postgres + RLS, Auth, Storage (public `media` bucket for images)
- Runs locally at http://localhost:3100 (`npx next dev -p 3100` in `web/`); deploy target is Vercel
- This Next version differs from older docs: read `web/node_modules/next/dist/docs/`
  before using an API you're unsure of (see `web/AGENTS.md`)
- Check changes with `npx tsc --noEmit`, `npx eslint src` and `npx next build` in `web/`
- Tests, all in `web/`: `npm test` (Vitest unit tests next to the code), `npm run test:db` (permission
  tests in `tests/db/`) and `npm run test:e2e` (Playwright, `tests/e2e/`). The last two need Docker:
  they run `npm run db:local` first, which starts a local Supabase, applies every migration and loads
  `supabase/seed.local.sql`. `npm run dev:local` serves the app on port 3101 against that local database.
  Tests never touch the real project. Known open issues are `it.fails` tests marked KNOWN ISSUE.

## Web structure
```
web/src/
  proxy.ts                  refreshes the session
  app/
    actions.ts              ALL server actions (every DB write goes through here)
    layout.tsx              root layout, fonts
    globals.css             design tokens (light + dark), .btn .btn-outline .input .skill .label
    page.tsx                redirects to /opportunities
    onboarding/             first-time flow after Google sign-in
    auth/callback/          OAuth callback
    (app)/
      layout.tsx            top bar (tabs, search, bell, avatar), phone tab bar, nav counts
      nav-tabs.tsx          active-tab tabs (desktop) and bottom tab bar (phones)
      opportunities/        list, [id] detail, new
      teams/                list with filters; [id] (page.tsx loads, team-view.tsx renders); new
      people/               tabs: Discover (/people), Requests (/people/requests), Connections (/people/connections)
      u/[id]/               profile: view + in-place editing for the owner (?as=visitor previews)
      profile/              redirects to /u/<you>; holds skill-picker and completion score
      feed/                 posts and ideas; on hold, not linked from the nav
      connect-button.tsx, avatar.tsx, select.tsx, team-list.tsx, global-search.tsx, notifications.tsx
  lib/
    match.ts                matching score (same as the iOS DiscoverViewModel)
    skills.ts               the fixed skill list and its groups
    portfolio.ts            project/experience types, period formatting, safe link/image helpers
    opportunities.ts, teams.ts, goals.ts
    supabase/server.ts      createClient, requireUser, requireMember
web/supabase/               SQL migrations, run by hand in the Supabase SQL Editor
```

## Database
Migrations live in `web/supabase/` and are run by hand, in this order:
`schema` → `opportunities` → `contact` → `teams` → `profile` → `portfolio` →
`connections-list` → `auth` → `notifications` → `goals` → `experience-details` →
`people-requests` → `opportunity-details` → `awards` → `length-limits` → `public-read`. `seed_opportunities.sql` and
`fix_admin.sql` are one-off helpers. `seed.local.sql` is fake data for the local test database only. New schema changes get a new file with a header
saying what it does and what it runs after; show the SQL, the user runs it.

Tables:
- `profiles` — name, headline, university, graduation_year, bio, skills[], interests[],
  looking_for[], goals[], open_to_collaborate, avatar_url, github, linkedin, website,
  telegram, email
- `experiences` — role, company, type, location, remote, start/end (1st of the month), description, skills[]
- `projects` — the profile's portfolio
- `connections` — sender_id, receiver_id, status (pending / accepted / declined)
- `opportunities` — title, type, organizer, location, online, url, deadline, starts_at, ends_at,
  status (live / hidden / removed), submitted_by. `check_new_opportunity()` limits 5 a day,
  rejects past dates and near-duplicate titles.
- `opportunity_participants` — people looking for a team for an opportunity
- `opportunity_reports` — 3 reports hide an opportunity; `admins` can restore or remove
- `teams` — owner, optional opportunity, title, description, roles[]
- `team_applications` — one per person per team, for one role; the owner accepts or declines
- `awards` — placement, prize_name, event_name (always set; the opportunity's title when linked),
  optional opportunity_id / project_id (own project) / team_id (a team you were on, set by the server
  for the same opportunity), awarded_on (1st of the month), proof_url, description
- `award_teammates` — award_id, user_id, status (pending / confirmed / declined). Only the owner tags;
  only the tagged person answers; declined rows stay so they can't be tagged again. Only confirmed rows
  are public. Changing an award's placement, prize, event or date sets confirmed teammates back to
  pending and notifies them (trigger in `awards.sql`).
- `notifications` — written only by triggers; the app just reads and marks them read
- `ideas`, `posts` — used by the on-hold feed

RPCs: `contact_for(profile_id)` and `connections_of(profile_id)`.

Privacy details that are easy to break:
- `telegram` and `email` are not selectable on `profiles`; the column-level grants in
  `contact.sql` exclude them. A new `profiles` column needs its own
  `grant select (column) on profiles to authenticated`.
- Contact details are read only through `contact_for`, which returns a row for yourself
  or an accepted connection and nothing otherwise.
- The `connections` table is private to the two people in each row; profile pages use
  `connections_of` for someone's accepted connections. Receivers accept or decline (update);
  senders can withdraw while pending (delete, `people-requests.sql`).

## Auth
- Signed-out visitors browse read-only with no account: they use the `anon` role, which the
  read policies include (`public-read.sql`) and no write policy does. `requireUser()` returns
  them with `isGuest: true` and a `userId` that matches no row; server actions use
  `requireMember()`. Old anonymous guest sessions are treated the same, and the restrictive
  "Guests can't ..." policies still block them. Nothing creates anonymous users any more.
- Members sign in with Google. After the first sign-in, `/onboarding` collects the basics.
- Never trust client-sent user IDs; read the user from the server session
  (`requireUser` / `requireMember`).
- Pages that call `requireUser` export `instant = false` (see the comment in `server.ts`).

## Design
The UI follows **Direction A ("Document")** from the Claude Design project "Schub
Directions" (`Schub A - Document.dc.html`): the calm, CV-like direction. No cards;
structure comes from full-width rules and a fixed label column. One indigo accent,
neutral everything else.
- Tokens in `globals.css`, used as Tailwind colors: `background`, `foreground`, `ink2`,
  `muted`, `border` (light rule), `line2` (section rule), `chip`, `accent`,
  `accent-soft`, `on-accent`. Dark values come from `prefers-color-scheme`.
- Fonts: Instrument Sans (`font-sans`) and IBM Plex Mono (`font-mono`, for skill chips
  and small labels).
- Profile building blocks: `u/[id]/profile-parts.tsx` (Section, SideBlock, EmptyPrompt,
  ChipTable). Owner editing: `u/[id]/edit-dialog.tsx` (modal from sm up, bottom sheet on
  phones) and `u/[id]/section-edits.tsx` (one form per section, grouped with a label column).
- Redesign status: `/u/[id]`, `/teams` (list, `[id]`, `new`), `/people` (three tabs) and
  `/opportunities` (list, `[id]`, `new`) and `/onboarding` are done. Only the on-hold `/feed`
  still has the old layout (with the new tokens and fonts).

## Coding rules

### 1. Think before coding
- State assumptions before implementing
- If multiple approaches exist, name them and pick one
- If unclear, ask rather than guess

### 2. Simplicity first
- Minimum code that solves the problem
- No speculative features
- No abstractions for single-use code

### 3. Surgical changes
- Touch only what the task requires
- Match existing code style
- Don't refactor adjacent code that isn't broken

### 4. Goal-driven execution
- Define what "done" looks like before writing code
- For multi-step tasks, state the plan first

### 5. TypeScript
- No `any` types
- Prefer server components; use `"use client"` only when necessary
- All DB writes through server actions in `actions.ts`

### 6. UI rules
- No emoji in the UI
- Light and dark mode on every component
- Mobile-first layouts
- Tailwind only — no inline styles

### 7. Matching
`lib/match.ts` scores complementary skills highest, then shared interests, then shared
skills. Keep matching logic there.
