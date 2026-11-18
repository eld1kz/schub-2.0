import type { ReactNode } from "react";

// Shared card styles: profile sections, and the clickable cards on list pages

// Tints the whole page behind the cards; sits under everything else
export function PageBackground() {
  return <div aria-hidden className="fixed inset-0 -z-10 bg-zinc-50 dark:bg-zinc-950" />;
}

export const cardBox = "rounded-2xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900";

// A whole card that links somewhere
export const linkCard = `${cardBox} block p-5 transition-colors hover:border-zinc-300 dark:hover:border-zinc-700`;

export function Card({ title, note, action, children }: { title?: string; note?: string; action?: ReactNode; children: ReactNode }) {
  return (
    <section className={`${cardBox} p-6`}>
      {title && (
        <div className="mb-4">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">{title}</h2>
            {action}
          </div>
          {note && <p className="mt-0.5 text-xs text-muted">{note}</p>}
        </div>
      )}
      {children}
    </section>
  );
}

// Items inside a card, split by thin lines
export const dividedList = "divide-y divide-zinc-100 dark:divide-zinc-800 [&>*]:py-4 [&>*:first-child]:pt-0 [&>*:last-child]:pb-0";
