"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const tabs = [
  { href: "/teams", label: "Find teams" },
  { href: "/teams/mine", label: "Your teams" },
];

// Underlined tabs like People's, one row at every width. Each tab is its own route, so links and Back work.
export function TeamsTabs({ toReview }: { toReview: number }) {
  const pathname = usePathname();
  return (
    <nav aria-label="Teams" className="flex gap-6 border-b border-line2 text-[15px] font-medium text-ink2 sm:gap-7">
      {tabs.map((t) => (
        <Link
          key={t.href}
          href={t.href}
          aria-current={pathname === t.href ? "page" : undefined}
          className="py-2.5 whitespace-nowrap hover:text-foreground aria-[current=page]:text-foreground aria-[current=page]:shadow-[inset_0_-2px_0_var(--accent)]"
        >
          {t.label}
          {t.href === "/teams/mine" && toReview > 0 && <span className="ml-1.5 font-semibold text-accent tabular-nums">{toReview}</span>}
        </Link>
      ))}
    </nav>
  );
}
