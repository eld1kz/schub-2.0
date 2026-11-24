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

// Counts that open a page of their own: pending connection requests go straight to the Requests tab,
// applicants to review and invitations to answer to Your teams
const countLinks: Record<string, { href: string; label: string }> = {
  "/people": { href: "/people/requests", label: "connection requests" },
  "/teams": { href: "/teams/mine", label: "applications and invitations waiting on you" },
};

function Count({ n }: { n?: number }) {
  return n ? <span className="ml-1 font-semibold text-accent tabular-nums">{n}</span> : null;
}

// A tab's count: a link of its own when it has a page, otherwise part of the tab's label
function CountLink({ tab, n }: { tab: string; n?: number }) {
  const link = countLinks[tab];
  if (!n || !link) return null;
  return (
    <Link href={link.href} aria-label={`${n} ${link.label}`} className="ml-1 font-semibold text-accent tabular-nums hover:underline">
      {n}
    </Link>
  );
}

// Desktop: tabs in the top bar, the current one underlined
export function NavTabs({ counts = {} }: { counts?: Counts }) {
  const pathname = usePathname();
  return (
    <nav className="hidden h-[60px] gap-6 text-sm font-medium text-ink2 sm:flex">
      {tabs.map((t) => (
        <span key={t.href} className="flex items-center">
          <Link
            href={t.href}
            aria-current={isActive(pathname, t.href) ? "page" : undefined}
            className="flex h-full items-center hover:text-foreground aria-[current=page]:text-foreground aria-[current=page]:shadow-[inset_0_-2px_0_var(--accent)]"
          >
            {t.label}
            {!countLinks[t.href] && <Count n={counts[t.href]} />}
          </Link>
          <CountLink tab={t.href} n={counts[t.href]} />
        </span>
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
        <span key={t.label} className="flex items-center justify-center">
          <Link
            href={t.href}
            aria-current={isActive(pathname, t.href) || (t.label === "Profile" && pathname === "/profile") ? "page" : undefined}
            className="flex h-16 items-center aria-[current=page]:font-semibold aria-[current=page]:text-foreground"
          >
            {t.label}
            {!countLinks[t.href] && <Count n={counts[t.href]} />}
          </Link>
          <CountLink tab={t.href} n={counts[t.href]} />
        </span>
      ))}
    </nav>
  );
}
