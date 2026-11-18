import { notFound } from "next/navigation";
import { requireUser } from "@/lib/supabase/server";
import { today } from "@/lib/opportunities";
import { teamSummaryColumns, type TeamSummary } from "@/lib/teams";
import { OpportunityView, type Opportunity, type Participant } from "./opportunity-view";

export const instant = false;

export default async function OpportunityPage(props: PageProps<"/opportunities/[id]">) {
  const { id } = await props.params;
  const { supabase, userId, isGuest } = await requireUser();
  const [opportunity, participants, me, connections, myReport, admin, teams] = await Promise.all([
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
  ]);
  const o = opportunity.data as Opportunity | null;
  if (!o) notFound();

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
      userId={userId}
      isGuest={isGuest}
      today={today()}
    />
  );
}
