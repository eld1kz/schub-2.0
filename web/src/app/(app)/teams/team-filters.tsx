"use client";

import { useRouter } from "next/navigation";

// Changing either dropdown updates the URL (?role=Designer&status=open), so filters can be shared and undone with Back
export function TeamFilters({ roles, role, status }: { roles: string[]; role: string; status: string }) {
  const router = useRouter();
  const go = (next: { role: string; status: string }) => {
    const params = new URLSearchParams();
    if (next.role) params.set("role", next.role);
    if (next.status) params.set("status", next.status);
    const query = params.toString();
    router.push(query ? `/teams?${query}` : "/teams");
  };

  return (
    <div className="flex flex-col gap-3 sm:flex-row">
      <div className="flex-1">
        <label className="label" htmlFor="role">Open role</label>
        <select id="role" value={role} onChange={(e) => go({ role: e.target.value, status })} className="input">
          <option value="">Any role</option>
          {roles.map((r) => <option key={r} value={r}>{r}</option>)}
        </select>
      </div>
      <div className="sm:w-40">
        <label className="label" htmlFor="status">Status</label>
        <select id="status" value={status} onChange={(e) => go({ role, status: e.target.value })} className="input">
          <option value="">All</option>
          <option value="open">Open</option>
          <option value="full">Full</option>
        </select>
      </div>
    </div>
  );
}
