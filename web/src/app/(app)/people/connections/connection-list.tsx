"use client";

import { useState } from "react";
import { PersonRow } from "../person-row";

export type ConnectionItem = { id: string; name: string; headline: string; avatar_url: string; telegram: string; email: string; awarded: boolean };

const contactLink = "text-[13px] font-medium text-accent hover:underline";

// Everyone you're connected with, filtered by name as you type
export function ConnectionList({ people }: { people: ConnectionItem[] }) {
  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();
  const shown = q ? people.filter((p) => p.name.toLowerCase().includes(q)) : people;

  return (
    <div className="flex flex-col gap-6">
      <div className="relative max-w-[320px]">
        <svg viewBox="0 0 24 24" aria-hidden className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 fill-none stroke-muted" strokeWidth={2} strokeLinecap="round">
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-3.5-3.5" />
        </svg>
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search your connections"
          aria-label="Search your connections by name"
          className="input h-10 pl-9 text-sm"
        />
      </div>

      {shown.length === 0 ? (
        <p className="text-sm text-ink2">No connections named &ldquo;{query.trim()}&rdquo;.</p>
      ) : (
        <div className="flex flex-col">
          {shown.map((p) => (
            <PersonRow key={p.id} id={p.id} name={p.name} headline={p.headline} avatarUrl={p.avatar_url} awarded={p.awarded}>
              {(p.telegram || p.email) && (
                <p className="mt-0.5 flex flex-wrap gap-x-4 gap-y-1">
                  {p.telegram && <a href={`https://t.me/${encodeURIComponent(p.telegram)}`} target="_blank" rel="noreferrer" className={contactLink}>t.me/{p.telegram}</a>}
                  {p.email && <a href={`mailto:${p.email}`} className={`${contactLink} break-all`}>{p.email}</a>}
                </p>
              )}
            </PersonRow>
          ))}
        </div>
      )}
    </div>
  );
}
