import Link from "next/link";
import { requireUser } from "@/lib/supabase/server";
import { recruitingRoles, teamRank, teamSummaries, teamSummaryColumns, type TeamSummary } from "@/lib/teams";
import { today } from "@/lib/opportunities";
import { myConnections } from "@/lib/connections";
import { awardedIds } from "@/lib/awards";
import { TeamList } from "../../team-list";
import { TeamFilters } from "./team-filters";
import { knownLanguages, oneOf, suitedModes } from "@/lib/languages";

export const instant = false;

export default async function TeamsPage(props: PageProps<"/teams">) {
  const params = await props.searchParams;
  const role = typeof params.role === "string" ? params.role : "";
  const status = params.status === "open" || params.status === "full" ? params.status : "";
  const lang = knownLanguages([params.lang])[0] ?? "";
  // Teams that said Either count for both
  const mode = oneOf(["In person", "Remote"], params.mode);
  const { supabase, userId, isGuest } = await requireUser();
  const day = today();
  const [{ data }, awarded, mine, looking, connections] = await Promise.all([
    supabase.from("teams").select(teamSummaryColumns).order("created_at", { ascending: false }),
    awardedIds(supabase),
    supabase.from("team_applications").select("team_id, status, direction").eq("user_id", userId),
    supabase.from("opportunity_participants").select("opportunity_id").eq("user_id", userId),
    myConnections(supabase, userId, isGuest),
  ]);
  const memberOf = new Set((mine.data ?? []).filter((a) => a.status === "accepted").map((a) => a.team_id));
  // Invitations to you aren't applications; they wait in Your teams
  const applied = new Set((mine.data ?? []).filter((a) => a.status !== "accepted" && a.direction === "application").map((a) => a.team_id));
  const lookingFor = new Set((looking.data ?? []).map((p) => p.opportunity_id));
  // Teams you run or are on live in Your teams
  const all = teamSummaries(data, day).filter((t) => t.owner_id !== userId && !memberOf.has(t.id));

  // Roles teams are recruiting for: none once a team's event is over (lib/teams.ts)
  const recruiting = (t: TeamSummary) => recruitingRoles(t, day);
  // Role choices are the open roles teams actually list, one per spelling regardless of case
  const roles = [...new Map(all.flatMap(recruiting).map((r) => [r.toLowerCase(), r])).values()].sort((a, b) => a.localeCompare(b));

  // Newest first within each group of teamRank (the query's order, kept by the stable sort)
  const rank = (t: TeamSummary) => teamRank(t, lookingFor, connections, day);
  const teams = all
    .filter((t) => {
      const open = recruiting(t);
      if (role && !open.some((r) => r.toLowerCase() === role.toLowerCase())) return false;
      if (lang && !t.languages.includes(lang)) return false;
      if (mode && !suitedModes(mode).includes(t.work_mode)) return false;
      if (status === "open") return open.length > 0;
      if (status === "full") return open.length === 0;
      return true;
    })
    .sort((a, b) => rank(a) - rank(b));
  const filtered = role !== "" || status !== "" || lang !== "" || mode !== "";
  const selectedRole = roles.find((r) => r.toLowerCase() === role.toLowerCase()) ?? role;
  // A role from the URL that no team lists any more still shows as selected
  const options = role && !roles.includes(selectedRole) ? [...roles, role] : roles;
  const withOpenRoles = all.filter((t) => recruiting(t).length > 0).length;
  const empty = filtered ? (
    <>
      No teams match these filters.{lang || mode ? " Only teams that set a language or work mode show up for those." : ""}{" "}
      <Link href="/teams" className="font-semibold text-accent hover:underline">Clear filters</Link>
    </>
  ) : (
    "No teams to join yet. Post yours and list the roles you need."
  );

  return (
    <div>
      <p className="hidden pb-4 text-base text-ink2 sm:block">
        {withOpenRoles} {withOpenRoles === 1 ? "team has" : "teams have"} open roles. Teams for opportunities where you&apos;re looking for a team come first, then teams your connections are on, then the rest, newest first.
      </p>
      <TeamFilters roles={options} filters={{ role: selectedRole, status, lang, mode }} />
      <TeamList teams={teams} userId={userId} awarded={awarded} applied={applied} connections={connections} empty={empty} />
    </div>
  );
}
