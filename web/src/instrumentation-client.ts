import * as Sentry from "@sentry/nextjs";
import { sentryOptions } from "@/lib/sentry";

Sentry.init(sentryOptions);

// The SDK asks for this hook; with tracing off it records nothing
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
