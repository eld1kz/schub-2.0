import { notFound } from "next/navigation";
import { requireUser } from "@/lib/supabase/server";
import { today } from "@/lib/opportunities";
import { teamSummaryColumns, type TeamSummary } from "@/lib/teams";
import { awardColumns, awardedIds, byRank, type Award } from "@/lib/awards";
import { OpportunityView, type Opportunity, type Participant } from "./opportunity-view";

export const instant = false;

export default async function OpportunityPage(props: PageProps<"/opportunities/[id]">) {
  const { id } = await props.params;
  const { supabase, userId, isGuest } = await requireUser();
  const [opportunity, participants, me, connections, myReport, admin, teams, awards, awarded] = await Promise.all([
    supabase.from("opportunities").select("*").eq("id", id).maybeSingle(),
    supabase
      .from("opportunity_participants")
      .select("user_id, note, person:profiles(id, name, headline, avatar_url, university, skills, interests, open_to_collaborate)")
      .eq("opportunity_id", id)
      .order("created_at"),
    supabase.from("profiles").select("skills, interests, open_to_collaborate").eq("id", userId).single(),
    supabase.from("connections").select("sender_id, receiver_id, status"),
    supabase.from("opportunity_reports").select("reason").eq("opportunity_id", id).eq("user_id", userId).maybeSingle(),
    supabase.rpc("is_admin"),
    supabase.from("teams").select(teamSummaryColumns).eq("opportunity_id", id).order("created_at", { ascending: false }),
    supabase.from("awards").select(awardColumns).eq("opportunity_id", id),
    awardedIds(supabase),
  ]);
  const o = opportunity.data as Opportunity | null;
  if (!o) notFound();
  // Results show once the event is over: after its end, or its start when there's no end
  const lastDay = o.ends_at ?? o.starts_at;
  const ended = lastDay !== null && lastDay < today();

  // Your connection status with each person, by their id
  const statusWith: Record<string, string> = {};
  for (const c of connections.data ?? []) statusWith[c.sender_id === userId ? c.receiver_id : c.sender_id] = c.status;

  return (
    <OpportunityView
      o={o}
      participants={(participants.data ?? []) as unknown as Participant[]}
      me={me.data ?? { skills: [], interests: [], open_to_collaborate: true }}
      statusWith={statusWith}
      myReport={myReport.data?.reason ?? null}
      canDelete={o.submitted_by === userId || Boolean(admin.data)}
      teams={(teams.data ?? []) as unknown as TeamSummary[]}
      placed={ended ? ((awards.data ?? []) as unknown as Award[]).sort(byRank) : null}
      awarded={awarded}
      userId={userId}
      isGuest={isGuest}
      today={today()}
    />
  );
}
