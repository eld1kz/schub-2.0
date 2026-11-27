import { notFound } from "next/navigation";
import { requireUser } from "@/lib/supabase/server";
import { today } from "@/lib/opportunities";
import { matchScore } from "@/lib/match";
import { experienceColumns, projectColumns, sortExperiences, type Experience, type Project } from "@/lib/portfolio";
import { awardColumns, type Award } from "@/lib/awards";
import { sharedProjectColumns, type SharedProject } from "@/lib/shared-projects";
import { ConnectButton } from "../../connect-button";
import { ProfileView, type Connection, type ProfileData, type Suggestion } from "./profile-view";

type Opportunity = { id: string; title: string; starts_at: string | null; deadline: string | null } | null;
type Person = { id: string; name: string; headline: string; avatar_url: string; skills: string[]; interests: string[]; open_to_collaborate: boolean; languages: string[] };

const suggestionCount = 4;
// "People you may team up with" picks the best matches from this many recently updated open collaborators
const suggestionPool = 50;

export const instant = false;

export default async function UserPage(props: PageProps<"/u/[id]">) {
  const { id } = await props.params;
  const { as } = await props.searchParams;
  const { supabase, userId, isGuest } = await requireUser();
  const isSelf = id === userId;
  // Guests can look at their own page but can't save, so they don't get the edit buttons
  const canEdit = isSelf && !isGuest;
  // "?as=visitor": the owner sees the page without edit controls, empty sections or contact details
  const preview = canEdit && as === "visitor";
  const [profile, ideas, myConnections, contacts, projects, experiences, owned, joined, looking, connections, mine, people, ownAwards, tags, opportunities, shared] = await Promise.all([
    supabase
      .from("profiles")
      .select("name, headline, university, graduation_year, bio, skills, interests, looking_for, goals, open_to_collaborate, wanted_roles, languages, hours_per_week, work_mode, city, avatar_url, github, linkedin, website")
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
    supabase.from("profiles").select("skills, interests, open_to_collaborate, languages").eq("id", userId).maybeSingle(),
    supabase
      .from("profiles")
      .select("id, name, headline, avatar_url, skills, interests, open_to_collaborate, languages")
      .neq("name", "")
      .eq("open_to_collaborate", true)
      .neq("id", userId)
      .neq("id", id)
      .order("updated_at", { ascending: false })
      .limit(suggestionPool),
    supabase.from("awards").select(awardColumns).eq("user_id", id),
    // Awards this profile was tagged in: confirmed ones for everyone, and on your own profile the pending ones too
    supabase.from("award_teammates").select(`status, award:awards(${awardColumns})`).eq("user_id", id).in("status", ["confirmed", "pending"]),
    // Events to pick from in the award form
    canEdit && !preview ? supabase.from("opportunities").select("id, title").order("starts_at", { ascending: false, nullsFirst: false }) : { data: [] },
    // Team projects this profile is on: confirmed ones for everyone, and on your own profile the pending ones too
    supabase.from("team_project_members").select(`status, hidden, project:team_projects(${sharedProjectColumns})`).eq("user_id", id).in("status", ["confirmed", "pending"]),
  ]);
  const p = profile.data as ProfileData | null;
  if (!p) notFound();

  const tagRows = (tags.data ?? []) as unknown as { status: string; award: Award | null }[];
  const tagged = (status: string) => tagRows.flatMap((t) => (t.status === status && t.award ? [t.award] : []));
  const awards = [...((ownAwards.data ?? []) as unknown as Award[]), ...tagged("confirmed")].sort((a, b) => b.awarded_on.localeCompare(a.awarded_on));
  const projectList = (projects.data ?? []) as unknown as Project[];
  const sharedRows = ((shared.data ?? []) as unknown as { status: string; hidden: boolean; project: SharedProject | null }[]).filter((r) => r.project);
  // Visitors (and your preview) see what wasn't hidden; on your own page hidden ones show too, to bring back
  const sharedProjects = sharedRows
    .filter((r) => r.status === "confirmed" && (!r.hidden || (canEdit && !preview)))
    .map((r) => ({ project: r.project as SharedProject, hidden: r.hidden }));
  const builtByTeam = new Map(sharedProjects.filter((s) => !s.hidden).map((s) => [s.project.team_id, s.project.title]));

  const teams = [
    ...(owned.data ?? []).map((t) => ({ id: t.id as string, title: t.title as string, role: "Started it", built: builtByTeam.get(t.id as string) })),
    ...(joined.data ?? []).flatMap((a) => {
      const team = a.team as unknown as { id: string; title: string } | null;
      return team ? [{ id: team.id, title: team.title, role: a.role as string, built: builtByTeam.get(team.id) }] : [];
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
  const me = mine.data ?? { skills: [], interests: [], open_to_collaborate: true };
  const suggestions: Suggestion[] = ((people.data ?? []) as Person[])
    .filter((x) => !statusWith(x.id))
    .map((x) => ({ ...x, score: matchScore(x, me).score }))
    .sort((a, b) => b.score - a.score)
    .slice(0, suggestionCount)
    .map((x) => ({ id: x.id, name: x.name, headline: x.headline, avatar_url: x.avatar_url, connect: <ConnectButton profileId={x.id} isGuest={isGuest} variant="accent" size="xs" /> }));

  return (
    <ProfileView
      id={id}
      profile={p}
      canEdit={canEdit && !preview}
      // Requests sent to you are the pending ones you received
      owner={canEdit ? { preview, requests: links.filter((c) => c.receiver_id === userId && c.status === "pending").length } : undefined}
      action={!isSelf && <ConnectButton profileId={id} status={statusWith(id)} isGuest={isGuest} variant="primary" />}
      contact={preview ? undefined : (contacts.data as { telegram: string; email: string }[] | null)?.[0]}
      projects={projectList}
      awards={awards}
      // Only on your own page, and not while previewing it as a visitor
      pendingAwards={canEdit && !preview ? tagged("pending") : []}
      sharedProjects={sharedProjects}
      pendingShared={canEdit && !preview ? sharedRows.filter((r) => r.status === "pending").map((r) => r.project as SharedProject) : []}
      awardOptions={{ opportunities: opportunities.data ?? [], projects: projectList.map((x) => ({ id: x.id, title: x.title })) }}
      experiences={sortExperiences((experiences.data ?? []) as unknown as Experience[])}
      teams={teams}
      events={events}
      ideas={ideas.data ?? []}
      connections={(connections.data ?? []) as Connection[]}
      suggestions={suggestions}
    />
  );
}
