import type { ReactNode } from "react";
import Link from "next/link";
import { Pop } from "./pop";
import { TabUnderline } from "./tab-underline";

export type Tab = {
  href: string;
  label: ReactNode;
  current: boolean;
  count?: number;
  // The count is something waiting on you: in the accent, and only when there's one
  alert?: boolean;
};

// Underlined tabs, each its own route so links and Back work; the line slides between them (DESIGN.md). `scroll`: more tabs than fit on a phone,
// so they scroll sideways in one row, out to the screen's edges.
export function Tabs({ label, tabs, scroll = false }: { label: string; tabs: Tab[]; scroll?: boolean }) {
  return (
    <nav aria-label={label} className={`relative flex gap-6 [&[data-slides]_a]:shadow-none border-b border-line2 text-base font-medium text-ink2 ${scroll ? "-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0" : ""}`}>
      {tabs.map((t) => (
        <Link
          key={t.href}
          href={t.href}
          aria-current={t.current ? "page" : undefined}
          className="shrink-0 py-2 whitespace-nowrap transition-colors focus-visible:-outline-offset-2 hover:text-foreground aria-[current=page]:text-foreground aria-[current=page]:shadow-tab"
        >
          {t.label}
          {t.count !== undefined && (t.alert ? t.count > 0 && <Pop value={t.count} className="ml-1.5 font-semibold text-accent tabular-nums" /> : <span className="text-muted tabular-nums"> {t.count}</span>)}
        </Link>
      ))}
      <TabUnderline />
    </nav>
  );
}
