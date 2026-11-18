"use client";

import { Fragment, useState, type ReactNode } from "react";

// Filters the already-loaded list by title as you type; no server call. `header` sits above the rows.
export function OpportunitySearch({ rows, header, empty }: { rows: { id: string; title: string; node: ReactNode }[]; header: ReactNode; empty: string }) {
  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();
  const shown = q ? rows.filter((r) => r.title.toLowerCase().includes(q)) : rows;

  return (
    <div className="flex flex-col gap-5">
      <div className="relative max-w-[320px]">
        <svg viewBox="0 0 24 24" aria-hidden className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 fill-none stroke-muted" strokeWidth={2} strokeLinecap="round">
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-3.5-3.5" />
        </svg>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search opportunities"
          aria-label="Search opportunities by title"
          className="input h-10 pr-9 pl-9 text-sm"
        />
        {query && (
          <button type="button" onClick={() => setQuery("")} aria-label="Clear search" className="absolute inset-y-0 right-0 px-3 text-muted hover:text-foreground">
            <svg viewBox="0 0 24 24" aria-hidden className="h-4 w-4 fill-none stroke-current" strokeWidth={2} strokeLinecap="round">
              <path d="M6 6l12 12M18 6 6 18" />
            </svg>
          </button>
        )}
      </div>
      {rows.length === 0 && <p className="py-4 text-[15px] text-ink2">{empty}</p>}
      {rows.length > 0 && shown.length === 0 && <p className="py-4 text-[15px] text-ink2">No opportunities match &ldquo;{query.trim()}&rdquo;.</p>}
      {shown.length > 0 && (
        <div>
          {header}
          {shown.map((r) => <Fragment key={r.id}>{r.node}</Fragment>)}
        </div>
      )}
    </div>
  );
}
