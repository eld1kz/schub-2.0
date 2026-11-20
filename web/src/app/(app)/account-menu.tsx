"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { usePathname } from "next/navigation";

// Your avatar in the top bar, opening Your profile, Settings and Sign out.
// Closes on navigation or a click outside, like the notifications menu.
export function AccountMenu({ avatar, children }: { avatar: ReactNode; children: ReactNode }) {
  const ref = useRef<HTMLDetailsElement>(null);
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
    <details ref={ref} className="relative">
      <summary aria-label="Account menu" className="block cursor-pointer list-none rounded-full hover:opacity-80 [&::-webkit-details-marker]:hidden">
        {avatar}
      </summary>
      <div className="absolute right-0 z-10 mt-2 flex w-48 flex-col rounded-md border border-border bg-background py-1 text-sm shadow-lg">
        {children}
      </div>
    </details>
  );
}
