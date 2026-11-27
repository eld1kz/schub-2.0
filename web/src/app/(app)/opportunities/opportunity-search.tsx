"use client";

import { Search, X, CalendarDays } from "lucide-react";
import { Fragment, useState, type ReactNode } from "react";
import { Input, Icon, Button, EmptyState } from "@/components/ui";

// Filters the already-loaded list by title as you type; no server call. `header` sits above the rows.
export function OpportunitySearch({ rows, header, empty, emptyAction }: { rows: { id: string; title: string; node: ReactNode }[]; header: ReactNode; empty: ReactNode; emptyAction: ReactNode }) {
  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();
  const shown = q ? rows.filter((r) => r.title.toLowerCase().includes(q)) : rows;

  return (
    <div className="flex flex-col gap-4">
      <div className="relative max-w-search">
        <Icon icon={Search} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted" />
        <Input
          search
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search opportunities"
          aria-label="Search opportunities by title"
          className="pr-8 pl-8"
        />
        {query && (
          <button type="button" onClick={() => setQuery("")} aria-label="Clear search" className="absolute inset-y-0 right-0 px-3 text-muted hover:text-foreground">
            <Icon icon={X} />
          </button>
        )}
      </div>
      {rows.length === 0 && <EmptyState icon={CalendarDays} action={emptyAction}>{empty}</EmptyState>}
      {rows.length > 0 && shown.length === 0 && (
        <EmptyState icon={Search} action={<Button type="button" variant="secondary" size="sm" onClick={() => setQuery("")}>Show all results</Button>}>
          No opportunities match &ldquo;{query.trim()}&rdquo;.
        </EmptyState>
      )}
      {shown.length > 0 && (
        <div>
          {header}
          {shown.map((r) => <Fragment key={r.id}>{r.node}</Fragment>)}
        </div>
      )}
    </div>
  );
}
