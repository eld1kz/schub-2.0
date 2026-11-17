cat > ~/Projects/schub-2.0/web/CLAUDE.md << 'HEREDOC'
# CLAUDE.md — Schub Web

## What this is
Schub is a social network for student builders to find teammates for hackathons, competitions, and projects. Students browse opportunities, signal interest, get matched with compatible teammates, and connect.

## Stack
- Next.js 16, TypeScript, Tailwind CSS
- Supabase (database + guest/real auth)
- All DB writes go through Next.js server actions in `src/app/actions.ts`
- Never write to the DB directly from client components
- Runs locally at http://localhost:3100, deploy target: Vercel

## Project structure
src/
app/
(app)/
opportunities/ ← home page, opportunity detail, add new
people/ ← browse all students ranked by match
u/[id]/ ← individual profile page
feed/ ← on hold
profile/ ← edit your own profile
connect-button.tsx ← shared connect/pending/connected button
layout.tsx ← nav, guest session init
actions.ts ← ALL server actions live here
layout.tsx
page.tsx ← redirects to /opportunities
lib/
match.ts ← matching algorithm
opportunities.ts
supabase/server.ts


## Database tables
- `profiles` — id, name, university, graduation_year, bio, skills[], interests[], open_to_collaborate, telegram, email, avatar_url
- `opportunities` — id, title, type, deadline, link, description, created_by
- `connections` — id, sender_id, receiver_id, status (pending/accepted/declined)
- `looking_for_team` — id, user_id, opportunity_id, note
- `reports` — id, user_id, opportunity_id
- `admins` — id, user_id

## Current build priority
1. **Contact after connecting** — show Telegram/email once connection is accepted
2. **Teams with open roles** — post a project, list roles needed, let people apply
3. **Real login** — Google OAuth + magic link email
4. **Deploy to Vercel**
5. **Real opportunity content**

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

### 7. Auth
- Currently: Supabase anonymous auth (guest accounts per browser)
- Next: Google OAuth + magic link
- Never trust client-sent user IDs — always read from the server session

## Feature notes

### Contact after connecting
Show `telegram` and `email` from profiles on `/u/[id]` only when the connection
status between the viewer and the profile owner is `accepted`.
Also add telegram/email fields to the profile edit form.

### Teams with open roles
A team post lists open roles (CTO, Designer, etc.).
Schub's core differentiator. People apply; author accepts or declines.

### Matching algorithm (lib/match.ts)
Scores highest for complementary skills, then shared interests, then shared skills.
Keep this logic centralized here.
HEREDOC

Run that in your terminal. Once done, here’s the Claude Code prompt to build Feature 1: Contact after connecting:

Paste this into Claude Code (in your web project folder):

Feature: Contact after connecting

Goal: after two users are connected (connection status = 'accepted'), each can 
see the other's telegram username and email on their profile page (/u/[id]).

What "done" looks like:
- /u/[id] shows a "Contact" section with telegram + email when the viewer and 
  the profile owner have an accepted connection
- The section is completely hidden for everyone else (pending, not connected, 
  self-viewing)
- Profile edit page has telegram and email fields so users can fill them in
- telegram/email columns exist in the profiles table (add a migration if missing)

Plan before coding:
1. Check if telegram and email columns exist in the profiles table
2. If missing, create a SQL migration (just show the SQL, don't run it — I'll 
   run it in Supabase)
3. Add telegram + email fields to the profile edit form in src/app/(app)/profile/page.tsx
4. In src/app/(app)/u/[id]/page.tsx:
   - Check the connection status between the current user and the profile owner
   - If status is 'accepted', fetch and display their telegram + email
   - Show a clean "Contact" card — telegram as a t.me link if present, email as 
     a mailto link if present
5. Make sure RLS allows reading telegram/email only when a connection exists
   (or just read it server-side since we already validate on the server)

Keep it simple. No new tables. No inbox. Just show the info after connecting.