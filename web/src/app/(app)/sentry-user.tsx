"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

// Browser errors carry the signed-in member's user id, and nothing else about them
export function SentryUser({ id }: { id: string }) {
  useEffect(() => {
    Sentry.setUser({ id });
    return () => Sentry.setUser(null);
  }, [id]);
  return null;
}
