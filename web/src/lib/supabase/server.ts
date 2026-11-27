import * as Sentry from "@sentry/nextjs";
import { createServerClient } from "@supabase/ssr";
import { createClient as createPlainClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { connection } from "next/server";

// No session at all: reads exactly what a signed-out visitor can, whoever asks. For generated images,
// which are cached and shared, so they must never depend on who requested them.
export function publicClient() {
  return createPlainClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          // Server Components can't set cookies; the proxy refreshes the session instead.
          try {
            cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
          } catch {}
        },
      },
    },
  );
}

// A signed-out visitor's userId: matches no row, so queries keyed on the user return nothing
export const NOBODY = "00000000-0000-0000-0000-000000000000";

// The visitor, signed in or not. `isGuest` is true for signed-out visitors (and for old anonymous guest
// sessions from before guests were removed): they browse read-only and see "Sign in to ..." buttons.
export async function requireUser() {
  // Checking the token reads the clock, which Next only allows once rendering is per-request.
  // That makes the page wait for this call, so pages that call it export `instant = false`
  // (Next only honors that per page, not from a shared layout).
  await connection();
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims.sub;
  const isGuest = !userId || data?.claims.is_anonymous === true;
  // Errors in this request are reported with the member's user id only (lib/sentry.ts)
  Sentry.setUser(userId && !isGuest ? { id: userId } : null);
  return { supabase, userId: userId ?? NOBODY, isGuest };
}

// For writes: visitors have to sign in with Google first
export async function requireMember() {
  const user = await requireUser();
  if (user.isGuest) throw new Error("Sign in to do that");
  return user;
}
