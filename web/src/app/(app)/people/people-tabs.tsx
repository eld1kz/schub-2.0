"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const tabs = [
  { href: "/people", label: "Discover" },
  { href: "/people/requests", label: "Requests" },
  { href: "/people/connections", label: "Connections" },
];

// Underlined tabs, one row at every width. Each tab is its own route, so links and Back work.
export function PeopleTabs({ requests }: { requests: number }) {
  const pathname = usePathname();
  return (
    <nav aria-label="People" className="flex gap-6 border-b border-line2 text-base font-medium text-ink2">
      {tabs.map((t) => (
        <Link
          key={t.href}
          href={t.href}
          aria-current={pathname === t.href ? "page" : undefined}
          className="py-2 whitespace-nowrap hover:text-foreground aria-[current=page]:text-foreground aria-[current=page]:shadow-[inset_0_-2px_0_var(--accent)]"
        >
          {t.label}
          {t.href === "/people/requests" && requests > 0 && <span className="ml-1.5 font-semibold text-accent tabular-nums">{requests}</span>}
        </Link>
      ))}
    </nav>
  );
}
