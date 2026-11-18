import { notFound } from "next/navigation";
import { requireUser } from "@/lib/supabase/server";
import { today } from "@/lib/opportunities";
import { matchScore } from "@/lib/match";
import { experienceColumns, projectColumns, type Experience, type Project } from "@/lib/portfolio";
import { ConnectButton } from "../../connect-button";
import { ProfileView, type Connection, type ProfileData, type Suggestion } from "./profile-view";

type Opportunity = { id: string; title: string; starts_at: string | null; deadline: string | null } | null;
type Person = { id: string; name: string; headline: string; avatar_url: string; skills: string[]; interests: string[]; open_to_collaborate: boolean };

const suggestionCount = 4;

export const instant = false;

export default async function UserPage(props: PageProps<"/u/[id]">) {
  const { id } = await props.params;
  const { supabase, userId, isGuest } = await requireUser();
  const isSelf = id === userId;
  // Guests can look at their own page but can't save, so they don't get the edit buttons
  const canEdit = isSelf && !isGuest;
  const [profile, ideas, myConnections, contacts, projects, experiences, owned, joined, looking, connections, people] = await Promise.all([
    supabase
      .from("profiles")
      .select("name, headline, university, graduation_year, bio, skills, interests, looking_for, goals, open_to_collaborate, avatar_url, github, linkedin, website")
      .eq("id", id)
      .maybeSingle(),
    supabase.from("ideas").select("id, title, description, skills_needed, stage").eq("author_id", id).order("created_at", { ascending: false }),
    // Only your own connections are visible to you
    supabase.from("connections").select("sender_id, receiver_id, status"),
    // Returns a row only when the connection is accepted, or for yourself (to edit it)
    isSelf && !canEdit ? { data: null } : supabase.rpc("contact_for", { profile_id: id }),
    supabase.from("projects").select(projectColumns).eq("user_id", id).order("year", { ascending: false, nullsFirst: false }).order("created_at", { ascending: false }),
    supabase.from("experiences").select(experienceColumns).eq("user_id", id).order("start_date", { ascending: false }),
    supabase.from("teams").select("id, title").eq("owner_id", id).order("created_at", { ascending: false }),
    supabase.from("team_applications").select("role, team:teams(id, title)").eq("user_id", id).eq("status", "accepted"),
    supabase.from("opportunity_participants").select("opportunity:opportunities(id, title, starts_at, deadline)").eq("user_id", id),
    // Accepted connections of this profile (supabase/connections-list.sql)
    supabase.rpc("connections_of", { profile_id: id }),
    supabase.from("profiles").select("id, name, headline, avatar_url, skills, interests, open_to_collaborate"),
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

  const links = myConnections.data ?? [];
  const statusWith = (other: string) => links.find((c) => c.sender_id === other || c.receiver_id === other)?.status as string | undefined;
  // Open collaborators you have no connection with yet, best match for you first
  const everyone = (people.data ?? []) as Person[];
  const me = everyone.find((x) => x.id === userId) ?? { skills: [], interests: [], open_to_collaborate: true };
  const suggestions: Suggestion[] = everyone
    .filter((x) => x.id !== userId && x.id !== id && x.name && x.open_to_collaborate && !statusWith(x.id))
    .map((x) => ({ ...x, score: matchScore(x, me).score }))
    .sort((a, b) => b.score - a.score)
    .slice(0, suggestionCount)
    .map((x) => ({ id: x.id, name: x.name, headline: x.headline, avatar_url: x.avatar_url, connect: <ConnectButton profileId={x.id} isGuest={isGuest} /> }));

  return (
    <ProfileView
      id={id}
      profile={p}
      canEdit={canEdit}
      action={!isSelf && <ConnectButton profileId={id} status={statusWith(id)} isGuest={isGuest} />}
      contact={(contacts.data as { telegram: string; email: string }[] | null)?.[0]}
      projects={(projects.data ?? []) as unknown as Project[]}
      experiences={(experiences.data ?? []) as unknown as Experience[]}
      teams={teams}
      events={events}
      ideas={ideas.data ?? []}
      connections={(connections.data ?? []) as Connection[]}
      suggestions={suggestions}
    />
  );
}
