"use client";

import { useRouter } from "next/navigation";
import { LANGUAGES } from "@/lib/languages";
import { SORTS, filtersHref, type Filters } from "@/lib/opportunity-filters";
import { Select } from "../select";

const languageOptions = LANGUAGES.map((l) => ({ value: l, label: l }));
const sortOptions = Object.entries(SORTS).map(([value, label]) => ({ value, label }));

// Country (with how many events each has), language, "Can I join?" and sort. Each change is a new URL.
export function OpportunityFilters({ filters, countries }: { filters: Filters; countries: { value: string; label: string; count: number }[] }) {
  const router = useRouter();
  // Picking a place or language replaces "for you"; ?all=1 isn't needed alongside it
  const go = (next: Partial<Filters>) => router.push(filtersHref({ ...filters, all: false, ...next }));
  const countryOptions = countries.map((c) => ({ value: c.value, label: `${c.label} (${c.count})` }));

  return (
    <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-center">
      <div className="min-w-0 sm:w-52">
        <Select label="Country" placeholder="Any country" value={filters.country} onChange={(country) => go({ country })} options={countryOptions} required={false} small />
      </div>
      <div className="min-w-0 sm:w-40">
        <Select label="Language" placeholder="Any language" value={filters.lang} onChange={(lang) => go({ lang })} options={languageOptions} required={false} small />
      </div>
      <div className="min-w-0 sm:w-48">
        <Select label="Sort" placeholder="Deadline soonest" value={filters.sort} onChange={(sort) => router.push(filtersHref({ ...filters, sort: (sort || "deadline") as Filters["sort"] }))} options={sortOptions} small />
      </div>
      <label className="flex h-9 cursor-pointer items-center gap-2 text-sm text-ink2">
        <input
          type="checkbox"
          checked={filters.canJoin}
          onChange={(e) => router.push(filtersHref({ ...filters, canJoin: e.target.checked }))}
          className="h-4 w-4 cursor-pointer accent-[var(--accent)]"
        />
        Can I join?
      </label>
    </div>
  );
}
