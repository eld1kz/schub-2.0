"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type Counts = Record<string, number>;

const tabs = [
  { href: "/people", label: "People" },
  { href: "/teams", label: "Teams" },
  { href: "/opportunities", label: "Opportunities" },
];

const isActive = (pathname: string, href: string) => pathname === href || pathname.startsWith(`${href}/`);

function Count({ n }: { n?: number }) {
  return n ? <span className="ml-1 font-semibold text-accent tabular-nums">{n}</span> : null;
}

// Desktop: tabs in the top bar, the current one underlined
export function NavTabs({ counts = {} }: { counts?: Counts }) {
  const pathname = usePathname();
  return (
    <nav className="hidden h-[60px] gap-7 text-sm font-medium text-ink2 sm:flex">
      {tabs.map((t) => (
        <Link
          key={t.href}
          href={t.href}
          aria-current={isActive(pathname, t.href) ? "page" : undefined}
          className="flex items-center hover:text-foreground aria-[current=page]:text-foreground aria-[current=page]:shadow-[inset_0_-2px_0_var(--accent)]"
        >
          {t.label}
          <Count n={counts[t.href]} />
        </Link>
      ))}
    </nav>
  );
}

// Phones: the same tabs plus your profile, pinned to the bottom of the screen
export function TabBar({ counts = {}, profileHref }: { counts?: Counts; profileHref: string }) {
  const pathname = usePathname();
  const all = [{ href: profileHref, label: "Profile" }, ...tabs];
  return (
    <nav className="fixed inset-x-0 bottom-0 z-20 grid grid-cols-4 border-t border-border bg-background pb-[env(safe-area-inset-bottom)] text-xs font-medium text-muted sm:hidden">
      {all.map((t) => (
        <Link
          key={t.label}
          href={t.href}
          aria-current={isActive(pathname, t.href) || (t.label === "Profile" && pathname === "/profile") ? "page" : undefined}
          className="flex h-16 items-center justify-center aria-[current=page]:font-semibold aria-[current=page]:text-foreground"
        >
          {t.label}
          <Count n={counts[t.href]} />
        </Link>
      ))}
    </nav>
  );
}
