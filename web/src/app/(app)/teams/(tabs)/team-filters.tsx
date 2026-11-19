"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Select } from "../../select";

const statusOptions = [
  { value: "open", label: "Open roles" },
  { value: "full", label: "Full" },
];

// Filters live in the URL (?role=Designer&status=open), so they can be shared and undone with Back
const href = (next: { role: string; status: string }) => {
  const params = new URLSearchParams();
  if (next.role) params.set("role", next.role);
  if (next.status) params.set("status", next.status);
  const query = params.toString();
  return query ? `/teams?${query}` : "/teams";
};

function RoleChip({ label, active, to }: { label: string; active: boolean; to: string }) {
  return (
    <Link
      href={to}
      aria-current={active ? "true" : undefined}
      className={`shrink-0 rounded px-2.5 py-1 text-sm whitespace-nowrap ${active ? "bg-foreground font-medium text-background" : "border border-line2 hover:border-muted"}`}
    >
      {label}
    </Link>
  );
}

// One bar under the title: open roles as chips, then status. On phones the chips scroll sideways.
export function TeamFilters({ roles, role, status }: { roles: string[]; role: string; status: string }) {
  const router = useRouter();
  return (
    <div className="flex flex-col gap-3 border-b border-border py-3.5 sm:flex-row sm:items-center sm:gap-7 sm:border-t sm:border-t-line2">
      <div className="flex min-w-0 flex-1 items-center gap-4">
        <span className="hidden text-sm text-muted sm:inline">Role</span>
        <nav aria-label="Filter by open role" className="-mx-4 flex gap-1.5 overflow-x-auto px-4 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0">
          <RoleChip label="Any role" active={role === ""} to={href({ role: "", status })} />
          {roles.map((r) => <RoleChip key={r} label={r} active={r === role} to={href({ role: r, status })} />)}
        </nav>
      </div>
      <div className="w-40 shrink-0">
        <Select label="Status" placeholder="All teams" value={status} onChange={(s) => router.push(href({ role, status: s }))} options={statusOptions} required={false} small />
      </div>
    </div>
  );
}
