# Schub web

Next.js + Supabase version of Schub: feed, ideas, Discover with skill matching, and connections.
There is no login for now: each browser gets an anonymous guest account.

## Setup

1. Create a Supabase project, run `supabase/schema.sql` in the SQL Editor, and turn on
   **Authentication → Sign In / Providers → Allow anonymous sign-ins**.
2. Create `.env.local`:
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://<project>.supabase.co
   NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
   ```
3. `npm install && npm run dev`, then open http://localhost:3000.
