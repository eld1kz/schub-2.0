"use client";

import { Icon } from "@/components/ui";
import { Bell } from "lucide-react";
import { useEffect, useRef, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";

// The bell and its dropdown. Opening it refetches the list; it closes on navigation or a click outside.
export function NotificationMenu({ unread, children }: { unread: boolean; children: ReactNode }) {
  const ref = useRef<HTMLDetailsElement>(null);
  const router = useRouter();
  const pathname = usePathname();

  // Only when the page changes, not when this first runs: the menu may have been opened before the script arrived
  const openedOn = useRef(pathname);
  useEffect(() => {
    if (openedOn.current === pathname) return;
    openedOn.current = pathname;
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
    <details ref={ref} suppressHydrationWarning className="motion-menu relative" onToggle={(e) => e.currentTarget.open && router.refresh()}>
      <summary aria-label={unread ? "Notifications, some unread" : "Notifications"} className="relative block cursor-pointer list-none text-muted hover:text-foreground [&::-webkit-details-marker]:hidden">
        <Icon icon={Bell} />
        {unread && <span className="absolute -top-0.5 -right-0.5 h-2 w-2 animate-pop rounded-full bg-danger" />}
      </summary>
      <div className="fixed inset-x-4 top-16 z-10 rounded-md border border-border bg-background shadow-lg sm:absolute sm:inset-x-auto sm:top-auto sm:right-0 sm:mt-2 sm:w-80">
        {children}
      </div>
    </details>
  );
}
