import * as Sentry from "@sentry/nextjs";
import { sentryOptions } from "@/lib/sentry";

// Everything runs on the Node.js runtime (the proxy too), so there's no edge setup
export function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") Sentry.init(sentryOptions);
}

// Errors from pages, server actions, route handlers and the proxy
export const onRequestError = Sentry.captureRequestError;
