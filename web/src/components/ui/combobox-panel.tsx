"use client";

import { Icon } from "./icon";
import { Check } from "lucide-react";
import type { KeyboardEvent, Ref } from "react";
import { inputClass, inputHeight } from "./field";

// `hint` shows at the right of the option (a count); options with the same `group` sit together under its name
export type ComboboxOption = { value: string; label: string; hint?: string; group?: string };

// Consecutive options of one group, each with its place in the whole list
function grouped(options: ComboboxOption[]) {
  const groups: { name?: string; items: { option: ComboboxOption; index: number }[] }[] = [];
  options.forEach((option, index) => {
    const last = groups.at(-1);
    if (last && last.name === option.group) last.items.push({ option, index });
    else groups.push({ name: option.group, items: [{ option, index }] });
  });
  return groups;
}

// What an open Combobox shows: a search field (long lists) and the list. The Combobox puts it in a popup or a sheet
// and drives it; /design draws it on its own. `id` prefixes the ids that tie the highlighted option to what has focus.
export function ComboboxPanel({ id, label, options, selected, active, query, searchable, searchRef, listRef, onQuery, onActive, onChoose, onKeyDown }: {
  id: string;
  label: string;
  // Already filtered by the query
  options: ComboboxOption[];
  selected: string;
  // The highlighted option's index
  active: number;
  query: string;
  searchable: boolean;
  searchRef?: Ref<HTMLInputElement>;
  listRef?: Ref<HTMLDivElement>;
  onQuery?: (query: string) => void;
  onActive?: (index: number) => void;
  onChoose?: (value: string) => void;
  onKeyDown?: (e: KeyboardEvent) => void;
}) {
  const listId = `${id}-list`;
  const activeId = options[active] ? `${id}-option-${active}` : undefined;

  const row = ({ option, index }: { option: ComboboxOption; index: number }) => (
    <div
      key={option.value}
      id={`${id}-option-${index}`}
      role="option"
      aria-selected={option.value === selected}
      // The focus stays on the search field or the list
      onMouseDown={(e) => e.preventDefault()}
      onMouseMove={() => index !== active && onActive?.(index)}
      onClick={() => onChoose?.(option.value)}
      className={`flex min-h-11 cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-base sm:min-h-9 sm:text-sm ${index === active ? "bg-chip" : ""}`}
    >
      <Icon icon={Check} className={`text-accent ${option.value === selected ? "" : "invisible"}`} />
      <span className={`min-w-0 flex-1 break-words ${option.value === selected ? "font-medium" : ""}`}>{option.label}</span>
      {option.hint && <span className="shrink-0 text-meta text-muted tabular-nums">{option.hint}</span>}
    </div>
  );

  return (
    <div onKeyDown={onKeyDown} className="flex min-h-0 flex-1 flex-col">
      {searchable && (
        <div className="shrink-0 border-b border-border p-2">
          <input
            ref={searchRef}
            type="text"
            role="combobox"
            aria-label={`Search ${label}`}
            aria-expanded
            aria-controls={listId}
            aria-activedescendant={activeId}
            aria-autocomplete="list"
            autoComplete="off"
            spellCheck={false}
            placeholder="Search"
            value={query}
            readOnly={!onQuery}
            onChange={(e) => onQuery?.(e.target.value)}
            className={`${inputClass} ${inputHeight(false, true)}`}
          />
        </div>
      )}
      <div
        ref={listRef}
        id={listId}
        role="listbox"
        aria-label={`${label} options`}
        aria-activedescendant={searchable ? undefined : activeId}
        tabIndex={-1}
        className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-1 outline-none"
      >
        {grouped(options).map((g, i) =>
          g.name ? (
            <div key={g.name} role="group" aria-labelledby={`${id}-group-${i}`}>
              <div id={`${id}-group-${i}`} role="presentation" className="px-2 pt-3 pb-1 font-mono text-xs tracking-wide text-muted uppercase">{g.name}</div>
              {g.items.map(row)}
            </div>
          ) : (
            g.items.map(row)
          ),
        )}
      </div>
      {options.length === 0 && <p role="status" className="px-4 pb-3 text-sm text-muted">No matches</p>}
    </div>
  );
}
