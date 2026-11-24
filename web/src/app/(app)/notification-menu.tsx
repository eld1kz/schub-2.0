"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";

// The bell and its dropdown. Opening it refetches the list; it closes on navigation or a click outside.
export function NotificationMenu({ unread, children }: { unread: boolean; children: ReactNode }) {
  const ref = useRef<HTMLDetailsElement>(null);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    ref.current?.removeAttribute("open");
  }, [pathname]);

  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) ref.current.removeAttribute("open");
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  return (
    <details ref={ref} className="relative" onToggle={(e) => e.currentTarget.open && router.refresh()}>
      <summary aria-label={unread ? "Notifications, some unread" : "Notifications"} className="relative block cursor-pointer list-none text-muted hover:text-foreground [&::-webkit-details-marker]:hidden">
        <svg viewBox="0 0 24 24" aria-hidden className="h-5 w-5 fill-none stroke-current" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9M10.3 21a1.94 1.94 0 0 0 3.4 0" />
        </svg>
        {unread && <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-danger" />}
      </summary>
      <div className="fixed inset-x-4 top-16 z-10 rounded-md border border-border bg-background shadow-lg sm:absolute sm:inset-x-auto sm:top-auto sm:right-0 sm:mt-2 sm:w-80">
        {children}
      </div>
    </details>
  );
}
