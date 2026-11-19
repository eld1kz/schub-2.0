// Signs a browser in as a local user. The app only offers Google sign-in, so the tests sign in
// with a password against the LOCAL Supabase and hand the browser the same session cookies the app sets.
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import type { BrowserContext } from "@playwright/test";

const env = Object.fromEntries(
  readFileSync(".env.test.local", "utf8")
    .split("\n")
    .filter((line) => line.includes("=") && !line.startsWith("#"))
    .map((line) => [line.slice(0, line.indexOf("=")), line.slice(line.indexOf("=") + 1)]),
);

const url = env.NEXT_PUBLIC_SUPABASE_URL;
if (!/^http:\/\/(127\.0\.0\.1|localhost):\d+$/.test(url)) throw new Error(`Refusing to run against ${url}: local Supabase only`);

// Bypasses row level security, for checking what the app did. Local only (checked above).
export function service() {
  const status = JSON.parse(execFileSync("npx", ["supabase", "status", "-o", "json"], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }));
  return createClient(url, status.SECRET_KEY ?? status.SERVICE_ROLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
}

// Same ids and emails as supabase/seed.local.sql
export const id = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const email = (n: number) => `student${String(n).padStart(2, "0")}@schub.test`;

async function withSession(context: BrowserContext, start: (auth: ReturnType<typeof createServerClient>["auth"]) => Promise<{ data: { user: { id: string } | null }; error: Error | null }>) {
  const jar = new Map<string, string>();
  const supabase = createServerClient(url, env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, {
    cookies: {
      getAll: () => [...jar].map(([name, value]) => ({ name, value })),
      setAll: (cookies) => cookies.forEach(({ name, value }) => (value ? jar.set(name, value) : jar.delete(name))),
    },
  });
  const { data, error } = await start(supabase.auth);
  if (error || !data.user) throw error ?? new Error("No user");
  await context.addCookies([...jar].map(([name, value]) => ({ name, value, domain: "localhost", path: "/", sameSite: "Lax" as const })));
  return data.user.id;
}

// A seeded student, 1 to 20
export function signInAs(context: BrowserContext, n: number) {
  return withSession(context, (auth) => auth.signInWithPassword({ email: email(n), password: "password123" }));
}

// A brand-new account with an empty profile, like someone just back from Google sign-in
export function signUpNew(context: BrowserContext, name: string) {
  const address = `new-${crypto.randomUUID()}@schub.test`;
  return withSession(context, (auth) => auth.signUp({ email: address, password: "password123", options: { data: { name } } }));
}
