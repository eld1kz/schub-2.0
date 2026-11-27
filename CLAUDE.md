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
  tests in `tests/db/`), `npm run test:e2e` (Playwright, `tests/e2e/`) and `npm run test:visual` (screenshots,
  `tests/visual/`, in the Playwright Docker image; `test:visual:update` accepts changes). The last three need
  Docker: they run `npm run db:local` first, which starts a local Supabase, applies every migration and loads
  `supabase/seed.local.sql`. `npm run dev:local` serves the app on port 3101 against that local database.
  The e2e tests also serve sample event pages for "Fill from link" on port 3102 (`tests/e2e/fixtures`); the
  screenshot tests serve the app on 3103.
  Tests never touch the real project. Known open issues are `it.fails` tests marked KNOWN ISSUE.
- CI (`.github/workflows/ci.yml`) runs lint, types and all four test suites on every push and pull request.

## Error tracking
Sentry (`lib/sentry.ts`, `instrumentation.ts`, `instrumentation-client.ts`, `app/global-error.tsx`): errors only,
no tracing or session replay, off unless `NEXT_PUBLIC_SENTRY_DSN` is set. The only personal data sent is the user
id (`requireUser` on the server, `(app)/sentry-user.tsx` in the browser); `scrubEvent` drops cookies, headers,
bodies, query strings, breadcrumbs and email addresses in messages. Source maps upload only where
`SENTRY_AUTH_TOKEN` is set (with `SENTRY_ORG` and `SENTRY_PROJECT`).

## Web structure
```
web/src/
  proxy.ts                  refreshes the session
  app/
    actions.ts              ALL server actions (every DB write goes through here)
    layout.tsx              root layout, fonts
    globals.css             design tokens (DESIGN.md): colors (light-dark), type, spacing, radii, widths, named layouts
    page.tsx                landing page for signed-out visitors; members go to /opportunities
    landing-samples.tsx     the landing page's sample previews, built from app components (inert, data-sample)
    login/                  every sign-in option; ?next= is where to go back to
    sign-in-options.tsx     the sign-in buttons and email form, shared by / and /login
    onboarding/             first-time flow after the first sign-in
    auth/callback/          OAuth and email-link callback
    teams/[id]/share/       phone page opened from the share dialog's QR code: the story image and Share
    design/                 /design, development only: every ui component in every state, light and dark
    (app)/
      layout.tsx            top bar (tabs, search, bell, avatar), phone tab bar, nav counts
      nav-tabs.tsx          active-tab tabs (desktop) and bottom tab bar (phones)
      opportunities/        list (country, language, "Can I join?" and sort filters in the URL; "for you" by
                            default for members; admins' Review imports), [id] detail, [id]/edit (admins), new
                            (with "Fill from link"); event-actions.tsx is the event's action bar (Find a team,
                            Create a team, Enter your team), also inline on featured events
      teams/                list with filters; [id] (page.tsx loads, team-view.tsx renders,
                            story.png 1080x1920 share image, og.png link preview); new
      people/               tabs: Discover (/people), Requests (/people/requests), Connections (/people/connections)
      u/[id]/               profile: view + in-place editing for the owner (?as=visitor previews)
      profile/              redirects to /u/<you>; holds skill-picker and completion score
      settings/             your sign-in email and linked accounts, sign out, delete account
      feed/                 posts and ideas; on hold, not linked from the nav
      connect-button.tsx, team-list.tsx, global-search.tsx, notifications.tsx
      share-team.tsx        Share button and dialog: Web Share on phones, QR code / copy image on laptops
      entry-status.tsx      a team's status in an event: the owner's select, everyone else's label
  components/ui/            the design system's components (DESIGN.md), imported from @/components/ui
  lib/
    match.ts                matching score (the iOS DiscoverViewModel's, plus a shared-language adjustment)
    skills.ts               the fixed skill list and its groups
    roles.ts                the fixed team role list (wanted_roles, new teams' open roles) and role notes
    languages.ts            fixed lists of languages, hours a week and work modes; the work-style line
    invites.ts              "People who fill this role": who to suggest inviting for a team's open role
    shared-projects.ts      a team's shared project: columns, "Built with", when it can be recorded
    portfolio.ts            project/experience types, period formatting, safe link/image helpers
    teams.ts                team rows, open roles, entries: a team's current event (its soonest upcoming entry,
                            else the one that ended last) and recruitingRoles (none once that event is over)
    opportunities.ts, goals.ts
    opportunity-filters.ts  /opportunities filters, sorting, "for you" and the list of every country (counts for those with events)
    countries.ts            ISO country codes and names, and the country a typed-in city or address is in
    importers/              one module per source (Hack Club, Kaggle, K-Startup, Luma) returning one shape
                            (types.ts), dedupe.ts across sources, run.ts writes them; run by
                            scripts/import-opportunities.ts (npm run import:opportunities) twice a day from
                            .github/workflows/import-opportunities.yml. MLH and Devpost are out: their terms forbid it
    link-preview.ts         "Fill from link": an event page's schema.org Event and Open Graph tags as form values
    link-check.ts           the safe link check (no private addresses, limited redirects); fetchPage reads one page
    connections.ts          your accepted connections (one query per page) and which events they're going to
    story.ts, story-image.tsx  the team share images: wording (English, or Korean for mostly-Hangul teams) and
                            sizing (story.ts), drawing with next/og
    supabase/server.ts      createClient, requireUser, requireMember
web/DESIGN.md               tokens, components, when to use which, how to add one
web/eslint-rules/           design-tokens.mjs: the lint rule that keeps pages on the tokens and components
web/supabase/               SQL migrations, run by hand in the Supabase SQL Editor
web/assets/fonts/           TTFs for the share images (Instrument Sans, Plex Mono, Noto Sans KR for Hangul and Cyrillic)
```

## Database
Migrations live in `web/supabase/` and are run by hand, in this order:
`schema` → `opportunities` → `contact` → `teams` → `profile` → `portfolio` →
`connections-list` → `auth` → `notifications` → `goals` → `experience-details` →
`people-requests` → `opportunity-details` → `awards` → `length-limits` → `public-read` → `people-discover` →
`notification-limits` → `participant-notes` → `display-name` →
`own-images` → `team-contact` → `google-photos` → `account-photos` → `delete-account` → `open-to-team` → `languages` → `team-invites` → `shared-projects` → `team-entries` → `opportunity-engine` → `team-edit`. `seed_opportunities.sql` and
`fix_admin.sql` are one-off helpers. `seed.local.sql` is fake data for the local test database only; its dates are relative to today (`SEED_TODAY` pins today, as the screenshot tests do). New schema changes get a new file with a header
saying what it does and what it runs after; show the SQL, the user runs it.

Tables:
- `profiles` — name, headline, university, graduation_year, bio, skills[], interests[],
  looking_for[], goals[], open_to_collaborate (the "Open to a team" switch: a green ring on avatars),
  wanted_roles[] (from `lib/roles.ts`), languages[], hours_per_week, work_mode, city (`lib/languages.ts`),
  avatar_url, github, linkedin, website, telegram, email
- `experiences` — role, company, type, location, remote, start/end (1st of the month), description, skills[]
- `projects` — the profile's portfolio
- `connections` — sender_id, receiver_id, status (pending / accepted / declined)
- `opportunities` — title, type, organizer, location, online, url, deadline, starts_at, ends_at,
  status (live / hidden / removed), submitted_by, featured (only admins set it; first on /opportunities and the
  landing page). `check_new_opportunity()` limits 5 a day, rejects past dates and near-duplicate titles.
  Where and who (`opportunity-engine.sql`): country (ISO code, null when online only), city (old rows only have
  `location`), languages[] (`lib/languages.ts`), eligibility (anyone / students / country) and eligibility_note,
  inferred[] (fields an importer guessed). Imports: source and external_id (unique together), imported_at,
  needs_review (Luma, and anything without dates: only admins see it until approved), reviewed_at (set by an
  admin's approve, edit or reject; the importer then leaves the row alone). People can't add rows with any of these.
- `link_fetches` — one row per "Fill from link" page read, 20 an hour per member; no one reads it
- `opportunity_participants` — people looking for a team for an opportunity
- `opportunity_reports` — 3 reports hide an opportunity; `admins` can restore or remove
- `teams` — owner, title, description, roles[] (new teams pick from `lib/roles.ts`; old
  ones keep typed-in roles), role_notes (jsonb, role → short note), languages[], work_mode. The owner edits all of
  those and title and description (`team-edit.sql`); filled roles stay, and removing a role declines its pending
  applications and invites with a notification. `opportunity_id` is old and unused by the app: events are in `team_entries`; drop it
  once the version using `team_entries` is deployed (`team-entries.sql` header)
- `team_entries` — team_id, opportunity_id (one per pair), status (going / registered / submitted / placed),
  created_at. Anyone reads; only the team's owner enters (live events that haven't ended), changes the status or
  withdraws. Entering notifies accepted members (`team-entries.sql`)
- `team_applications` — one per person per team, for one role. direction 'application': the person applied and
  the owner accepts or declines; direction 'invite': the owner invited someone open to a team or a connection
  (10 a day), the invited person accepts or declines, and the owner can withdraw it while pending
  (`team-invites.sql`). Either way an accepted row is a member. Anything counting applicants must filter
  direction = 'application'
- `awards` — placement, prize_name, event_name (always set; the opportunity's title when linked),
  optional opportunity_id / project_id (own project) / team_id (a team you were on, set by the server
  when it entered the same opportunity), awarded_on (1st of the month), proof_url, description
- `award_teammates` — award_id, user_id, status (pending / confirmed / declined). Only the owner tags;
  only the tagged person answers; declined rows stay so they can't be tagged again. Only confirmed rows
  are public. Changing an award's placement, prize, event or date sets confirmed teammates back to
  pending and notifies them (trigger in `awards.sql`).
- `team_projects` — what a team built (one per team): title, pitch, image_url, url, repo_url, result. The owner
  records it once one of the team's events has ended (or any time without one) and edits it.
- `team_project_members` — project_id, user_id, status (pending / confirmed / declined), hidden. Written only by
  triggers (`shared-projects.sql`): the owner is confirmed, every accepted member is asked; changing the title or
  result sets confirmed members back to pending. Members answer and hide it from their own profile. Confirmed rows
  are public; confirmed, not hidden ones show in the member's Projects with "Built with".
- `notifications` — written only by triggers; the app just reads and marks them read
- `ideas`, `posts` — used by the on-hold feed

RPCs: `contact_for(profile_id)` and `connections_of(profile_id)`.

Privacy details that are easy to break:
- `telegram` and `email` are not selectable on `profiles`; the column-level grants in
  `contact.sql` exclude them. A new `profiles` column needs its own
  `grant select (column) on profiles to authenticated`.
- Contact details are read only through `contact_for`, which returns a row for yourself,
  an accepted connection, or someone on the same team (owner or accepted member; `team-contact.sql`),
  and nothing otherwise.
- The `connections` table is private to the two people in each row; profile pages use
  `connections_of` for someone's accepted connections. Receivers accept or decline (update);
  senders can withdraw while pending (delete, `people-requests.sql`).

## Auth
- Signed-out visitors browse read-only with no account: they use the `anon` role, which the
  read policies include (`public-read.sql`) and no write policy does. `requireUser()` returns
  them with `isGuest: true` and a `userId` that matches no row; server actions use
  `requireMember()`. Old anonymous guest sessions are treated the same, and the restrictive
  "Guests can't ..." policies still block them. Nothing creates anonymous users any more.
- Members sign in on `/login` with Google, GitHub, Kakao or an emailed link. `AUTH_PROVIDERS`
  (e.g. `google,github,email`) lists the methods that get a button; unset means Google only.
  Every "Sign in ..." button links to `/login?next=<this page>`. Failures land on `/login?error=1`.
  A member's Google or GitHub account photo is copied into `profiles.avatar_url` while they have no uploaded
  photo (`account-photos.sql`); `photoUrl` in `lib/portfolio.ts` shows only uploaded photos and those two hosts.
  `/auth/callback` sets the `last_sign_in_method` cookie (the method name only, 1 year, kept on sign-out,
  which lands on `/login`);
  the sign-in buttons put that method first with a "Last used" label.
  After the first sign-in with any method, `/onboarding` collects the basics.
- Members delete their own account from /settings: `deleteAccount` removes their files from Storage, then
  calls `delete_my_account()` (`delete-account.sql`), which hands owned teams to the member accepted earliest
  and deletes the auth user; the rest cascades. The last admin can't. A new table that references a user must
  cascade or be handled there (`tests/db/delete-account.test.ts` checks every foreign key).
- Never trust client-sent user IDs; read the user from the server session
  (`requireUser` / `requireMember`).
- Pages that call `requireUser` export `instant = false` (see the comment in `server.ts`).

## Design
The UI follows **Direction A ("Document")** from the Claude Design project "Schub
Directions" (`Schub A - Document.dc.html`): the calm, CV-like direction. No cards;
structure comes from full-width rules and a fixed label column. One indigo accent,
neutral everything else.
- **Use only `src/components/ui` and tokens. New patterns go into `ui/` first. Visual changes need
  `test:visual:update` and my approval.** `web/DESIGN.md` lists the tokens and components and when to use
  which; `npx eslint src` fails on bracket values, palette colors, spacing off the scale and `style=`.
- Tokens in `globals.css`: colors (`background`, `foreground`, `ink2`, `muted`, `border` (light rule), `line2`
  (section rule), `chip`, `accent`, `accent-soft`, `on-accent`, `open`, `danger`), each a light-dark() pair;
  8 type sizes plus `display`; spacing 2-32px plus 48/64/80; 3 radii; named widths and grid layouts.
- Fonts: Instrument Sans (`font-sans`) and IBM Plex Mono (`font-mono`, for skill chips
  and small labels).
- Profile-only pieces: `u/[id]/profile-parts.tsx` (SideBlock, KeyValue, SkillRows, ExperienceEntry). Owner editing: `u/[id]/edit-dialog.tsx` (modal from sm up, bottom sheet on
  phones) and `u/[id]/section-edits.tsx` (one form per section, grouped with a label column).
- Redesign status: `/u/[id]`, `/teams` (list, `[id]`, `new`), `/people` (three tabs) and
  `/opportunities` (list, `[id]`, `new`) and `/onboarding` are done. Only the on-hold `/feed`
  still has the old layout (with the new tokens and fonts).

## Token budget
- Run only tests related to your change. CI runs the full suite.
- No screenshots, audits or reviewer subagents unless I ask, or the change touches database, auth or permissions.
- Pixel-only screenshot changes: update and mention in one line.
- Reports: 5 lines max.

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

### 7. Settled decisions
Don't reopen these without asking:
- **Contact visibility:** Telegram and email show only to yourself, accepted connections and teammates, through
  `contact_for`; they're never selectable on `profiles`.
- **Award confirmation:** tagged teammates confirm or decline; only confirmed tags are public, and changing an
  award's placement, prize, event or date asks them again.
- **Opt-in ring:** the green ring means the person switched on "Open to a team"; nobody gets it by default.
- **No guest accounts:** signed-out visitors browse read-only as `anon`; nothing creates anonymous users.
- **No emoji** in the UI.
- **One accent color** (indigo); everything else is neutral.

### 8. Matching
`lib/match.ts` scores complementary skills highest, then shared interests, then shared
skills; when both people list languages, a shared one adds a bonus and none in common takes a lot off.
Keep matching logic there.
