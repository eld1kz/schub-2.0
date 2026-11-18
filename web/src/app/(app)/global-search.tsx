"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { searchGlobal, type SearchResults } from "@/app/actions";

// Search icon in the nav that opens an input; results for people and teams appear as you type
export function GlobalSearch() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResults | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  const close = () => {
    setOpen(false);
    setQuery("");
    setResults(null);
  };

  // Waits 300ms after the last keystroke; answers to older queries are ignored
  useEffect(() => {
    if (query.trim().length < 2) return;
    let stale = false;
    const timer = setTimeout(async () => {
      const found = await searchGlobal(query);
      if (!stale) setResults(found);
    }, 300);
    return () => {
      stale = true;
      clearTimeout(timer);
    };
  }, [query]);

  useEffect(() => {
    const outside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) close();
    };
    document.addEventListener("mousedown", outside);
    return () => document.removeEventListener("mousedown", outside);
  }, []);

  if (!open) {
    return (
      <button
        type="button"
        aria-label="Search people and teams"
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 text-muted hover:text-foreground sm:h-9 sm:w-[300px] sm:rounded-md sm:border sm:border-line2 sm:px-3 sm:text-sm"
      >
        <svg viewBox="0 0 24 24" aria-hidden className="h-5 w-5 fill-none stroke-current sm:h-4 sm:w-4" strokeWidth={2} strokeLinecap="round">
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-3.5-3.5" />
        </svg>
        <span className="hidden sm:inline">Search people and teams</span>
      </button>
    );
  }

  const result = (href: string, label: string) => (
    <li key={href}>
      <Link href={href} onClick={close} className="block truncate px-4 py-2 hover:bg-foreground/5">{label}</Link>
    </li>
  );

  return (
    // On phones the field covers the top bar while it's open
    <div ref={ref} className="fixed inset-x-0 top-0 z-30 flex h-[60px] items-center gap-3 bg-background px-4 sm:relative sm:h-auto sm:bg-transparent sm:px-0">
      <input
        autoFocus
        type="text"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          if (e.target.value.trim().length < 2) setResults(null);
        }}
        onKeyDown={(e) => e.key === "Escape" && close()}
        placeholder="Search people and teams"
        aria-label="Search people and teams"
        className="input h-9 py-0 text-sm sm:w-[300px]"
      />
      <button type="button" onClick={close} className="text-sm font-medium text-ink2 sm:hidden">Cancel</button>
      {results && (
        <div className="fixed inset-x-4 top-16 z-10 rounded-md border border-border bg-background py-2 shadow-lg sm:absolute sm:inset-x-auto sm:top-full sm:right-0 sm:mt-2 sm:w-[300px]">
          {results.people.length === 0 && results.teams.length === 0 && <p className="px-4 py-2 text-muted">No results</p>}
          {results.people.length > 0 && (
            <>
              <p className="px-4 pt-1 pb-1 text-xs text-muted">People</p>
              <ul>{results.people.map((p) => result(`/u/${p.id}`, p.name))}</ul>
            </>
          )}
          {results.teams.length > 0 && (
            <>
              <p className="px-4 pt-2 pb-1 text-xs text-muted">Teams</p>
              <ul>{results.teams.map((t) => result(`/teams/${t.id}`, t.title))}</ul>
            </>
          )}
        </div>
      )}
    </div>
  );
}
