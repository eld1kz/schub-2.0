"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ROLES } from "@/lib/roles";
import { peopleHref, type PeopleQuery } from "./people-query";
import { Select } from "../select";

const roleOptions = ROLES.map((r) => ({ value: r, label: `As ${r}` }));

// The bar above Discover: an "Open to a team" switch and the role they're open to. Filters live in the URL,
// so they can be shared and undone with Back; changing one goes back to page 1.
export function PeopleFilters({ query }: { query: PeopleQuery }) {
  const router = useRouter();
  return (
    <div className="flex flex-wrap items-center gap-2.5">
      <Link
        // Turning it off clears the role too, since a role only counts for people who are open
        href={peopleHref({ ...query, open: !query.open, role: query.open ? "" : query.role, page: 1 })}
        aria-current={query.open ? "true" : undefined}
        className={`flex h-9 items-center gap-2 rounded-md px-3 text-sm ${query.open ? "bg-foreground font-medium text-background" : "border border-line2 text-ink2 hover:border-muted hover:text-foreground"}`}
      >
        <span aria-hidden className="h-2 w-2 rounded-full bg-open" />
        Open to a team
      </Link>
      <div className="w-44">
        <Select label="Role they're open to" placeholder="Any role" value={query.role} onChange={(role) => router.push(peopleHref({ ...query, role, open: query.open || role !== "", page: 1 }))} options={roleOptions} required={false} small />
      </div>
    </div>
  );
}
