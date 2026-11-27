"use client";

import { useEffect, useState, type RefObject } from "react";

// True while `open`, and after that until the element's closing transition has run, so what's inside it stays
// rendered while it fades out. With reduced motion there's no transition and it's false at once.
export function useLinger(open: boolean, ref: RefObject<Element | null>) {
  const [lingering, setLingering] = useState(open);
  if (open && !lingering) setLingering(true);

  useEffect(() => {
    if (open || !lingering) return;
    let stale = false;
    const running = ref.current?.getAnimations() ?? [];
    Promise.allSettled(running.map((a) => a.finished)).then(() => {
      if (!stale) setLingering(false);
    });
    return () => {
      stale = true;
    };
  }, [open, lingering, ref]);

  return open || lingering;
}
