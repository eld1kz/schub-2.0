import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/supabase/server";
import { today } from "@/lib/opportunities";
import { experienceColumns, projectColumns, type Experience, type Project } from "@/lib/portfolio";
import { ConnectButton } from "../../connect-button";
import { ProfileView, type Connection, type ProfileData } from "./profile-view";

type Opportunity = { id: string; title: string; starts_at: string | null; deadline: string | null } | null;

export default async function UserPage(props: PageProps<"/u/[id]">) {
  const { id } = await props.params;
  const { supabase, userId } = await requireUser();
  const isSelf = id === userId;
  const [profile, ideas, connection, contacts, projects, experiences, owned, joined, looking, connections] = await Promise.all([
    supabase
      .from("profiles")
      .select("name, headline, university, graduation_year, bio, skills, interests, looking_for, open_to_collaborate, avatar_url, github, linkedin, website")
      .eq("id", id)
      .maybeSingle(),
    supabase.from("ideas").select("id, title, description, skills_needed, stage").eq("author_id", id).order("created_at", { ascending: false }),
    supabase.from("connections").select("status").or(`sender_id.eq.${id},receiver_id.eq.${id}`).maybeSingle(),
    // Returns a row only when the connection is accepted; never shown on your own page
    isSelf ? { data: null } : supabase.rpc("contact_for", { profile_id: id }),
    supabase.from("projects").select(projectColumns).eq("user_id", id).order("year", { ascending: false, nullsFirst: false }).order("created_at", { ascending: false }),
    supabase.from("experiences").select(experienceColumns).eq("user_id", id).order("start_date", { ascending: false }),
    supabase.from("teams").select("id, title").eq("owner_id", id).order("created_at", { ascending: false }),
    supabase.from("team_applications").select("role, team:teams(id, title)").eq("user_id", id).eq("status", "accepted"),
    supabase.from("opportunity_participants").select("opportunity:opportunities(id, title, starts_at, deadline)").eq("user_id", id),
    // Accepted connections of this profile (supabase/connections-list.sql)
    supabase.rpc("connections_of", { profile_id: id }),
  ]);
  const p = profile.data as ProfileData | null;
  if (!p) notFound();

  const teams = [
    ...(owned.data ?? []).map((t) => ({ id: t.id as string, title: t.title as string, role: "Started it" })),
    ...(joined.data ?? []).flatMap((a) => {
      const team = a.team as unknown as { id: string; title: string } | null;
      return team ? [{ id: team.id, title: team.title, role: a.role as string }] : [];
    }),
  ];
  const day = today();
  const events = (looking.data ?? []).flatMap((row) => {
    const o = row.opportunity as unknown as Opportunity;
    // Only events that haven't passed
    return o && ((o.deadline ?? o.starts_at ?? day) >= day || (o.starts_at ?? day) >= day) ? [{ id: o.id, title: o.title }] : [];
  });

  return (
    <ProfileView
      profile={p}
      isSelf={isSelf}
      action={isSelf ? <Link href="/profile" className="btn-outline">Edit profile</Link> : <ConnectButton profileId={id} status={connection.data?.status} />}
      contact={(contacts.data as { telegram: string; email: string }[] | null)?.[0]}
      projects={(projects.data ?? []) as unknown as Project[]}
      experiences={(experiences.data ?? []) as unknown as Experience[]}
      teams={teams}
      events={events}
      ideas={ideas.data ?? []}
      connections={(connections.data ?? []) as Connection[]}
    />
  );
}
