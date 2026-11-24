import { notFound } from "next/navigation";
import { requireUser } from "@/lib/supabase/server";
import { hasEnded, today } from "@/lib/opportunities";
import { eventState, myTeams, teamSummaries, teamSummaryColumns, type EntryStatus } from "@/lib/teams";
import { awardColumns, awardedIds, byRank, type Award } from "@/lib/awards";
import { OpportunityView, type Opportunity, type Participant } from "./opportunity-view";

export const instant = false;

export default async function OpportunityPage(props: PageProps<"/opportunities/[id]">) {
  const { id } = await props.params;
  const { supabase, userId, isGuest } = await requireUser();
  const day = today();
  const [opportunity, participants, me, connections, myReport, admin, entries, awards, awarded, yourTeams] = await Promise.all([
    supabase.from("opportunities").select("*").eq("id", id).maybeSingle(),
    supabase
      .from("opportunity_participants")
      .select("user_id, note, person:profiles(id, name, headline, avatar_url, university, skills, interests, open_to_collaborate, languages)")
      .eq("opportunity_id", id)
      .order("created_at"),
    supabase.from("profiles").select("skills, interests, open_to_collaborate, languages").eq("id", userId).single(),
    supabase.from("connections").select("sender_id, receiver_id, status"),
    supabase.from("opportunity_reports").select("reason").eq("opportunity_id", id).eq("user_id", userId).maybeSingle(),
    supabase.rpc("is_admin"),
    // Teams entered in it, the latest entry first (supabase/team-entries.sql)
    supabase.from("team_entries").select(`status, team:teams(${teamSummaryColumns})`).eq("opportunity_id", id).order("created_at", { ascending: false }),
    supabase.from("awards").select(awardColumns).eq("opportunity_id", id),
    awardedIds(supabase),
    // Your teams, for the action bar
    isGuest ? [] : myTeams(supabase, userId),
  ]);
  const o = opportunity.data as Opportunity | null;
  if (!o) notFound();
  // Results show once the event is over: after its end, or its start when there's no end
  const lastDay = o.ends_at ?? o.starts_at;
  const ended = lastDay !== null && lastDay < today();

  // Your connection status with each person, by their id
  const statusWith: Record<string, string> = {};
  for (const c of connections.data ?? []) statusWith[c.sender_id === userId ? c.receiver_id : c.sender_id] = c.status;
  const accepted = new Set(isGuest ? [] : Object.keys(statusWith).filter((id) => statusWith[id] === "accepted"));

  const entryRows = (entries.data ?? []) as unknown as { status: EntryStatus; team: unknown }[];
  const teams = teamSummaries(entryRows.map((e) => e.team).filter(Boolean), day);
  const statusOf = (teamId: string) => entryRows.find((e) => (e.team as { id: string } | null)?.id === teamId)?.status ?? "going";
  const { entered: myEntry, enterable } = eventState(yourTeams, id);
  const over = hasEnded(o, day);

  return (
    <OpportunityView
      o={o}
      participants={(participants.data ?? []) as unknown as Participant[]}
      me={me.data ?? { skills: [], interests: [], open_to_collaborate: true }}
      statusWith={statusWith}
      connections={accepted}
      myReport={myReport.data?.reason ?? null}
      canDelete={o.submitted_by === userId || Boolean(admin.data)}
      isAdmin={Boolean(admin.data)}
      // After the event, teams that only said they were going drop off the list
      teams={over ? teams.filter((t) => statusOf(t.id) !== "going") : teams}
      myEntry={myEntry}
      enterable={enterable}
      over={over}
      placed={ended ? ((awards.data ?? []) as unknown as Award[]).sort(byRank) : null}
      awarded={awarded}
      userId={userId}
      isGuest={isGuest}
      today={day}
    />
  );
}
