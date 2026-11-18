import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { connection } from "next/server";

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

export async function requireUser() {
  // Checking the token reads the clock, which Next only allows once rendering is per-request
  await connection();
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims.sub;
  if (!userId) throw new Error("Not signed in");
  // Guests are anonymous accounts the proxy creates so visitors can browse
  return { supabase, userId, isGuest: data?.claims.is_anonymous === true };
}

// For writes: guests have to sign in with Google first
export async function requireMember() {
  const user = await requireUser();
  if (user.isGuest) throw new Error("Sign in to do that");
  return user;
}
