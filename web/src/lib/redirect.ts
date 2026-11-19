// Where to send someone after sign-in: `next` when it's a page on this site, otherwise the home page.
// Resolving against our origin turns "//evil.com" or "https://evil.com" into another origin, which is refused.
export function safeRedirect(next: string | null, origin: string) {
  const url = URL.parse(next ?? "/", origin);
  return url && url.origin === origin ? url : new URL("/", origin);
}

// The same check for a `next` that stays a path: "/teams/1?tab=mine", or "/" when it would leave the site
export function localPath(next: string | null) {
  const url = safeRedirect(next, "http://local.invalid");
  return url.pathname + url.search;
}
