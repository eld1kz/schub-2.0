import Link from "next/link";
import { requireUser } from "@/lib/supabase/server";
import { openRoles, teamSummaryColumns, type TeamSummary } from "@/lib/teams";
import { awardedIds } from "@/lib/awards";
import { TeamList } from "../team-list";
import { TeamFilters } from "./team-filters";

export const instant = false;

export default async function TeamsPage(props: PageProps<"/teams">) {
  const params = await props.searchParams;
  const role = typeof params.role === "string" ? params.role : "";
  const status = params.status === "open" || params.status === "full" ? params.status : "";
  const { supabase, userId } = await requireUser();
  const [{ data }, awarded] = await Promise.all([
    supabase.from("teams").select(teamSummaryColumns).order("created_at", { ascending: false }),
    awardedIds(supabase),
  ]);
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
  const withOpenRoles = all.filter((t) => openRoles(t).length > 0).length;

  return (
    <div>
      <div className="flex items-end justify-between gap-6 pb-4 sm:pb-6">
        <div className="flex flex-col gap-1.5">
          <h1 className="text-[28px] font-semibold tracking-[-0.02em] sm:text-4xl sm:tracking-[-0.03em]">Teams</h1>
          <p className="hidden text-base text-ink2 sm:block">
            {withOpenRoles} {withOpenRoles === 1 ? "team has" : "teams have"} open roles. Your teams first, then teams that still need people.
          </p>
        </div>
        <Link href="/teams/new" className="btn hidden sm:inline-flex">Post a team</Link>
        <Link href="/teams/new" className="pb-1.5 text-[15px] font-semibold text-accent sm:hidden">+ Post</Link>
      </div>
      <TeamFilters roles={options} role={selectedRole} status={status} />
      <TeamList teams={teams} userId={userId} awarded={awarded} empty={filtered ? "No teams match these filters." : "No teams yet. Post yours and list the roles you need."} />
    </div>
  );
}
