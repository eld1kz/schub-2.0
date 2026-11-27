// Error tracking with Sentry, for the browser and the server: errors only (no tracing, no session replay).
// Off unless NEXT_PUBLIC_SENTRY_DSN is set. The only thing sent about a person is their user id: no email,
// contact details, cookies, headers, request bodies, query strings, IP address or breadcrumbs.
import type { ErrorEvent, EventHint } from "@sentry/nextjs";

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

const email = /[\w.+-]+(@|%40)[\w-]+(\.[\w-]+)+/gi;
const noEmails = (text: string) => text.replace(email, "[email]");
const noQuery = (url: string) => url.split(/[?#]/)[0];

// The last check on every error before it leaves
export function scrubEvent(event: ErrorEvent): ErrorEvent {
  if (event.user) event.user = event.user.id ? { id: event.user.id } : {};
  if (event.request) {
    const { url, method } = event.request;
    event.request = { ...(url && { url: noQuery(url) }), ...(method && { method }) };
  }
  const path = event.contexts?.nextjs?.request_path;
  if (typeof path === "string") event.contexts!.nextjs!.request_path = noQuery(path);
  delete event.breadcrumbs;
  delete event.extra;
  // Database errors can quote a row's values
  if (event.message) event.message = noEmails(event.message);
  for (const exception of event.exception?.values ?? []) {
    if (exception.value) exception.value = noEmails(exception.value);
  }
  return event;
}

// In the browser, an error with a digest happened on the server, which has already reported it with its stack
export function beforeSend(event: ErrorEvent, hint: EventHint): ErrorEvent | null {
  const error = hint.originalException;
  if (typeof window !== "undefined" && typeof error === "object" && error !== null && "digest" in error) return null;
  return scrubEvent(event);
}

export const sentryOptions = {
  dsn,
  enabled: Boolean(dsn),
  dataCollection: {
    userInfo: false,
    cookies: false,
    httpHeaders: false,
    httpBodies: [],
    urlQueryParams: false,
    databaseQueryData: false,
    stackFrameVariables: false,
  },
  maxBreadcrumbs: 0,
  // Session pings are for release health, not errors
  integrations: <T extends { name: string }>(defaults: T[]) => defaults.filter((i) => i.name !== "BrowserSession" && i.name !== "ProcessSession"),
  beforeSend,
};
