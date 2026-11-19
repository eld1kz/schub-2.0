import { notFound } from "next/navigation";
import { requireUser } from "@/lib/supabase/server";
import { myConnections } from "@/lib/connections";
import { TeamView, type Application, type Team } from "./team-view";

export const instant = false;

export default async function TeamPage(props: PageProps<"/teams/[id]">) {
  const { id } = await props.params;
  const { supabase, userId, isGuest } = await requireUser();
  const [team, applicationRows, connections] = await Promise.all([
    supabase.from("teams").select("id, title, description, roles, owner_id, owner:profiles(name, avatar_url, headline), opportunity:opportunities(id, title)").eq("id", id).maybeSingle(),
    // Row level security returns accepted members, your own application, and everything if you own the team
    supabase.from("team_applications").select("id, user_id, role, note, status, person:profiles(name, headline, university, skills, avatar_url)").eq("team_id", id).order("created_at"),
    myConnections(supabase, userId, isGuest),
  ]);
  const t = team.data;
  if (!t) notFound();

  return <TeamView team={t as unknown as Team} applications={(applicationRows.data ?? []) as unknown as Application[]} userId={userId} isGuest={isGuest} connections={connections} />;
}
