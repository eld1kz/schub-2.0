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
