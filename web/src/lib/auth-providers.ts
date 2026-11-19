// Sign-in methods, in the order the buttons show. Only the ones listed in AUTH_PROVIDERS
// (comma-separated, e.g. "google,github,email") get a button, so a method stays hidden until
// it's set up in Supabase. Unset means Google only, the one that was live first.
export const SIGN_IN_METHODS = ["google", "github", "kakao", "email"] as const;
export type SignInMethod = (typeof SIGN_IN_METHODS)[number];
export type OAuthProvider = Exclude<SignInMethod, "email">;

export function enabledMethods(list = process.env.AUTH_PROVIDERS ?? "google") {
  const listed = new Set(list.split(",").map((s) => s.trim().toLowerCase()));
  return SIGN_IN_METHODS.filter((m) => listed.has(m));
}

// Remembers, in this browser only, the method someone signed in with last. Holds the method name and nothing else.
export const LAST_METHOD_COOKIE = "last_sign_in_method";

// Which method a fresh session came from. The session's amr says email link or OAuth but not which
// provider, so for OAuth it's the identity signed in most recently (one account can link Google and GitHub).
// amr entries are { method, timestamp } from Supabase; plain strings (RFC 8176) count as oldest.
export function sessionMethod(amr: (string | { method: string; timestamp: number })[] | undefined, identities: { provider: string; last_sign_in_at?: string }[]): SignInMethod | null {
  const entries = (amr ?? []).map((e) => (typeof e === "string" ? { method: e, timestamp: 0 } : e));
  const latest = entries.sort((a, b) => b.timestamp - a.timestamp)[0]?.method;
  if (latest === "magiclink" || latest === "otp" || latest === "email/signup") return "email";
  if (latest !== "oauth") return null;
  const provider = identities
    .filter((i) => i.provider !== "email")
    .sort((a, b) => (b.last_sign_in_at ?? "").localeCompare(a.last_sign_in_at ?? ""))[0]?.provider;
  return SIGN_IN_METHODS.find((m) => m === provider) ?? null;
}

// The enabled methods with the last-used one moved to the top. A last method that's turned off is ignored.
export function lastUsedFirst(enabled: SignInMethod[], last: string | undefined) {
  const lastUsed = enabled.find((m) => m === last) ?? null;
  return { lastUsed, ordered: lastUsed ? [lastUsed, ...enabled.filter((m) => m !== lastUsed)] : enabled };
}
