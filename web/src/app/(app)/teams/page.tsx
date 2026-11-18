import Link from "next/link";
import { requireUser } from "@/lib/supabase/server";
import { openRoles, teamSummaryColumns, type TeamSummary } from "@/lib/teams";
import { TeamList } from "../team-list";
import { TeamFilters } from "./team-filters";

export const instant = false;

export default async function TeamsPage(props: PageProps<"/teams">) {
  const params = await props.searchParams;
  const role = typeof params.role === "string" ? params.role : "";
  const status = params.status === "open" || params.status === "full" ? params.status : "";
  const { supabase, userId } = await requireUser();
  const { data } = await supabase.from("teams").select(teamSummaryColumns).order("created_at", { ascending: false });
  const all = (data ?? []) as unknown as TeamSummary[];

  // Role choices are the open roles teams actually list, one per spelling regardless of case
  const roles = [...new Map(all.flatMap(openRoles).map((r) => [r.toLowerCase(), r])).values()].sort((a, b) => a.localeCompare(b));

  // Your own teams first, then teams that still have open roles
  const teams = all
    .filter((t) => {
      const open = openRoles(t);
      if (role && !open.some((r) => r.toLowerCase() === role.toLowerCase())) return false;
      if (status === "open") return open.length > 0;
      if (status === "full") return open.length === 0;
      return true;
    })
    .map((t) => ({ t, rank: t.owner_id === userId ? 0 : openRoles(t).length > 0 ? 1 : 2 }))
    .sort((a, b) => a.rank - b.rank)
    .map(({ t }) => t);
  const filtered = role !== "" || status !== "";
  const selectedRole = roles.find((r) => r.toLowerCase() === role.toLowerCase()) ?? role;
  // A role from the URL that no team lists any more still shows as selected
  const options = role && !roles.includes(selectedRole) ? [...roles, role] : roles;

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">Teams</h1>
        <Link href="/teams/new" className="btn-outline">Post a team</Link>
      </div>
      <TeamFilters roles={options} role={selectedRole} status={status} />
      <TeamList teams={teams} userId={userId} empty={filtered ? "No teams match these filters." : "No teams yet. Post yours and list the roles you need."} />
    </div>
  );
}
