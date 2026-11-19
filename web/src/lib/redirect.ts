// Where to send someone after sign-in: `next` when it's a page on this site, otherwise the home page.
// Resolving against our origin turns "//evil.com" or "https://evil.com" into another origin, which is refused.
export function safeRedirect(next: string | null, origin: string) {
  const url = URL.parse(next ?? "/", origin);
  return url && url.origin === origin ? url : new URL("/", origin);
}
