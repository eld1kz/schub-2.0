"use client";

import { Search } from "lucide-react";
import { useState } from "react";
import { PersonRow } from "../person-row";
import { Input, Icon, Button, EmptyState } from "@/components/ui";

export type ConnectionItem = { id: string; name: string; headline: string; avatar_url: string; open: boolean; telegram: string; email: string; awarded: boolean };

const contactLink = "text-meta font-medium text-accent hover:underline";

// Everyone you're connected with, filtered by name as you type
export function ConnectionList({ people }: { people: ConnectionItem[] }) {
  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();
  const shown = q ? people.filter((p) => p.name.toLowerCase().includes(q)) : people;

  return (
    <div className="flex flex-col gap-6">
      <div className="relative max-w-search">
        <Icon icon={Search} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted" />
        <Input
          search
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search your connections"
          aria-label="Search your connections by name"
          className="pl-8"
        />
      </div>

      {shown.length === 0 ? (
        <EmptyState icon={Search} action={<Button type="button" variant="secondary" size="sm" onClick={() => setQuery("")}>Show everyone</Button>}>
          No connections named &ldquo;{query.trim()}&rdquo;.
        </EmptyState>
      ) : (
        <div className="flex flex-col">
          {shown.map((p) => (
            <PersonRow key={p.id} id={p.id} name={p.name} headline={p.headline} avatarUrl={p.avatar_url} awarded={p.awarded} open={p.open}>
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
