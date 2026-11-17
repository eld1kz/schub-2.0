"use client";

import { useState } from "react";
import { SKILLS } from "@/lib/skills";

// Searchable multi-select over the fixed skill list. Each chosen skill is submitted as its own "skills" value.
export function SkillPicker({ id, defaultValue }: { id: string; defaultValue: string[] }) {
  const [selected, setSelected] = useState(defaultValue);
  const [query, setQuery] = useState("");
  const options = SKILLS.filter((s) => !selected.includes(s) && s.toLowerCase().includes(query.trim().toLowerCase()));
  const add = (skill: string) => {
    setSelected([...selected, skill]);
    setQuery("");
  };

  return (
    <div className="space-y-3">
      {selected.length > 0 && (
        <ul className="flex flex-wrap gap-2">
          {selected.map((s) => (
            <li key={s}>
              <input type="hidden" name="skills" value={s} />
              <button type="button" onClick={() => setSelected(selected.filter((x) => x !== s))} aria-label={`Remove ${s}`} className="skill inline-flex items-center gap-1.5">
                {s}<span aria-hidden className="font-normal opacity-60">×</span>
              </button>
            </li>
          ))}
        </ul>
      )}
      <input
        id={id}
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        // Enter picks the first match instead of submitting the form
        onKeyDown={(e) => {
          if (e.key !== "Enter") return;
          e.preventDefault();
          if (options[0]) add(options[0]);
        }}
        placeholder="Search skills"
        autoComplete="off"
        className="input"
      />
      {options.length > 0 ? (
        <ul className="flex max-h-40 flex-wrap gap-2 overflow-y-auto">
          {options.map((s) => (
            <li key={s}>
              <button type="button" onClick={() => add(s)} className="rounded-full border border-border px-3 py-1 text-sm text-muted hover:border-foreground hover:text-foreground">
                {s}
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted">{query ? "No skills match." : "You picked every skill."}</p>
      )}
    </div>
  );
}
