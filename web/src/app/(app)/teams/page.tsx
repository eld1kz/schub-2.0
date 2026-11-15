import Link from "next/link";
import { requireUser } from "@/lib/supabase/server";
import { openRoles, teamSummaryColumns, type TeamSummary } from "@/lib/teams";
import { TeamList } from "../team-list";

export default async function TeamsPage() {
  const { supabase, userId } = await requireUser();
  const { data } = await supabase.from("teams").select(teamSummaryColumns).order("created_at", { ascending: false });

  // Your own teams first, then teams that still have open roles
  const teams = ((data ?? []) as unknown as TeamSummary[])
    .map((t) => ({ t, rank: t.owner_id === userId ? 0 : openRoles(t).length > 0 ? 1 : 2 }))
    .sort((a, b) => a.rank - b.rank)
    .map(({ t }) => t);

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">Teams</h1>
        <Link href="/teams/new" className="btn-outline">Post a team</Link>
      </div>
      <TeamList teams={teams} userId={userId} empty="No teams yet. Post yours and list the roles you need." />
    </div>
  );
}
