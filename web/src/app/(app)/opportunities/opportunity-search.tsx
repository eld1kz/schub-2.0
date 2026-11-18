"use client";

import { Fragment, useState, type ReactNode } from "react";

// Filters the already-loaded list by title as you type; no server call
export function OpportunitySearch({ rows }: { rows: { id: string; title: string; node: ReactNode }[] }) {
  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();
  const shown = q ? rows.filter((r) => r.title.toLowerCase().includes(q)) : rows;

  return (
    <div className="space-y-4">
      <div className="relative">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search opportunities"
          aria-label="Search opportunities by title"
          className="input pr-9"
        />
        {query && (
          <button type="button" onClick={() => setQuery("")} aria-label="Clear search" className="absolute inset-y-0 right-0 px-3 text-muted hover:text-foreground">
            <svg viewBox="0 0 24 24" aria-hidden className="h-4 w-4 fill-none stroke-current" strokeWidth={2} strokeLinecap="round">
              <path d="M6 6l12 12M18 6 6 18" />
            </svg>
          </button>
        )}
      </div>
      <section className="grid gap-4 lg:grid-cols-2">
        {rows.length === 0 && <p className="py-6 text-sm text-muted lg:col-span-2">No upcoming opportunities yet.</p>}
        {rows.length > 0 && shown.length === 0 && <p className="py-6 text-sm text-muted lg:col-span-2">No opportunities match &ldquo;{query.trim()}&rdquo;.</p>}
        {shown.map((r) => <Fragment key={r.id}>{r.node}</Fragment>)}
      </section>
    </div>
  );
}
