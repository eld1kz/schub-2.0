"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { LANGUAGES } from "@/lib/languages";
import { Combobox } from "@/components/ui";

const languageOptions = LANGUAGES.map((l) => ({ value: l, label: l }));
const modeOptions = ["In person", "Remote"].map((m) => ({ value: m, label: m }));
const statusOptions = [
  { value: "open", label: "Open roles" },
  { value: "full", label: "Full" },
];

type Filters = { role: string; status: string; lang: string; mode: string };

// Filters live in the URL (?role=Designer&status=open&lang=Korean&mode=Remote), so they can be shared and undone with Back
const href = (next: Filters) => {
  const params = new URLSearchParams();
  if (next.role) params.set("role", next.role);
  if (next.status) params.set("status", next.status);
  if (next.lang) params.set("lang", next.lang);
  if (next.mode) params.set("mode", next.mode);
  const query = params.toString();
  return query ? `/teams?${query}` : "/teams";
};

function RoleChip({ label, active, to }: { label: string; active: boolean; to: string }) {
  return (
    <Link
      href={to}
      aria-current={active ? "true" : undefined}
      className={`shrink-0 rounded-sm px-2 py-1 text-sm whitespace-nowrap ${active ? "bg-foreground font-medium text-background" : "border border-line2 hover:border-muted"}`}
    >
      {label}
    </Link>
  );
}

// Under the title: open roles as chips, then language, work mode and status. On phones the chips scroll sideways;
// below lg the dropdowns sit on their own row, so the chips keep the full width.
export function TeamFilters({ roles, filters }: { roles: string[]; filters: Filters }) {
  const router = useRouter();
  const { role, status } = filters;
  return (
    <div className="flex flex-col gap-3 border-b border-border py-3 sm:border-t sm:border-t-line2 lg:flex-row lg:items-center lg:gap-6">
      <div className="flex min-w-0 flex-1 items-center gap-4">
        <span className="hidden text-sm text-muted sm:inline">Role</span>
        <nav aria-label="Filter by open role" className="-mx-4 flex gap-1.5 overflow-x-auto px-4 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0">
          <RoleChip label="Any role" active={role === ""} to={href({ ...filters, role: "" })} />
          {roles.map((r) => <RoleChip key={r} label={r} active={r === role} to={href({ ...filters, role: r })} />)}
        </nav>
      </div>
      <div className="grid shrink-0 grid-cols-2 gap-2 sm:flex">
        <div className="min-w-0 sm:w-36">
          <Combobox label="Team language" placeholder="Any language" value={filters.lang} onChange={(lang) => router.push(href({ ...filters, lang }))} options={languageOptions} required={false} small />
        </div>
        <div className="min-w-0 sm:w-36">
          <Combobox label="Work mode" placeholder="Any work mode" value={filters.mode} onChange={(mode) => router.push(href({ ...filters, mode }))} options={modeOptions} required={false} small />
        </div>
        <div className="col-span-2 min-w-0 sm:w-36">
          <Combobox label="Status" placeholder="All teams" value={status} onChange={(s) => router.push(href({ ...filters, status: s }))} options={statusOptions} required={false} small />
        </div>
      </div>
    </div>
  );
}
