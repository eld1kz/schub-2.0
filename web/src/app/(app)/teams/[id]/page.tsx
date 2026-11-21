import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { publicClient, requireUser } from "@/lib/supabase/server";
import { myConnections } from "@/lib/connections";
import { openRoles } from "@/lib/teams";
import { inviteSuggestions, type Candidate } from "@/lib/invites";
import { sharedProjectColumns, type SharedProject } from "@/lib/shared-projects";
import { awardColumns, byRank, formedOnSchub, type Award } from "@/lib/awards";
import { storyLang, storyVersion } from "@/lib/story";
import { TeamView, type Application, type Team } from "./team-view";

export const instant = false;

type PublicTeam = Parameters<typeof storyVersion>[0] & { opportunity: { id: string; title: string } | null };

// Link previews in chats: the open roles and the event, with the image from ./og.png. Public data only,
// like a signed-out visitor sees it, so the preview is the same whoever pasted the link.
export async function generateMetadata(props: PageProps<"/teams/[id]">): Promise<Metadata> {
  const { id } = await props.params;
  const { data } = await publicClient().from("teams").select("title, roles, owner_id, opportunity:opportunities(id, title), team_applications(user_id, role, status)").eq("id", id).maybeSingle();
  if (!data) return {};
  const team = data as unknown as PublicTeam;
  const open = openRoles(team);
  // Same language as the image: Korean when the title and roles are mostly Hangul
  const description = (
    storyLang([team.title, ...team.roles]) === "ko"
      ? [open.length > 0 ? `모집 중: ${open.join(", ")}` : "팀 구성 완료", team.opportunity?.title ?? "자체 프로젝트"]
      : [open.length > 0 ? `Needs: ${open.join(", ")}` : "All roles filled", team.opportunity ? `For ${team.opportunity.title}` : "Own project"]
  ).join(" · ");
  const image = { url: `/teams/${id}/og.png?v=${storyVersion(team)}`, width: 1200, height: 630, alt: `${team.title}: ${description}` };
  return {
    title: `${team.title} · Schub`,
    description,
    openGraph: { title: team.title, description, siteName: "Schub", images: [image] },
    twitter: { card: "summary_large_image", title: team.title, description, images: [image] },
  };
}

export default async function TeamPage(props: PageProps<"/teams/[id]">) {
  const { id } = await props.params;
  const { supabase, userId, isGuest } = await requireUser();
  const [team, applicationRows, connections, project, awards] = await Promise.all([
    supabase.from("teams").select("id, title, description, roles, role_notes, languages, work_mode, owner_id, owner:profiles(name, avatar_url, headline, open_to_collaborate, languages), opportunity:opportunities(id, title, ends_at, starts_at, deadline)").eq("id", id).maybeSingle(),
    // Row level security returns accepted members, your own application, and everything if you own the team
    supabase.from("team_applications").select("id, user_id, role, note, status, direction, person:profiles(name, headline, university, skills, avatar_url, open_to_collaborate)").eq("team_id", id).order("created_at"),
    myConnections(supabase, userId, isGuest),
    // What the team built (supabase/shared-projects.sql), and awards for the team, shown together
    supabase.from("team_projects").select(sharedProjectColumns).eq("team_id", id).maybeSingle(),
    supabase.from("awards").select(awardColumns).eq("team_id", id),
  ]);
  const t = team.data;
  if (!t) notFound();

  const applications = (applicationRows.data ?? []) as unknown as Application[];
  const version = storyVersion({ ...(t as unknown as Team), team_applications: applications });
  const suggestions = t.owner_id === userId && !isGuest ? await inviteCandidates(supabase, t as unknown as Team, applications, connections) : {};
  const sharedProject = (project.data as unknown as SharedProject | null) ?? null;
  // Only awards for the team's own event, from people who confirmed the project (anyone on the team could link an award)
  const confirmed = new Set((sharedProject?.team_project_members ?? []).filter((m) => m.status === "confirmed").map((m) => m.user_id));
  const award = ((awards.data ?? []) as unknown as Award[]).filter((a) => formedOnSchub(a) && confirmed.has(a.user_id)).sort(byRank)[0];
  // The database's own rule (supabase/shared-projects.sql): a hidden event can't be read here, but still counts
  const canRecord = t.owner_id === userId && !sharedProject ? Boolean((await supabase.rpc("team_project_open", { team: id })).data) : false;
  return (
    <TeamView
      team={t as unknown as Team}
      applications={applications}
      userId={userId}
      isGuest={isGuest}
      connections={connections}
      shareVersion={version}
      suggestions={suggestions}
      sharedProject={sharedProject}
      award={award}
      canRecord={canRecord}
    />
  );
}

// How many recently updated people open to a team are considered for "People who fill this role", besides your connections
const candidatePool = 200;

// For the owner: up to 5 people per open role to invite (lib/invites.ts). Members, applicants and anyone already
// invited are left out; the owner sees every application row to their team.
async function inviteCandidates(supabase: Awaited<ReturnType<typeof requireUser>>["supabase"], team: Team, applications: Application[], connections: Set<string>) {
  const columns = "id, name, headline, avatar_url, skills, languages, wanted_roles, open_to_collaborate";
  const [open, connected] = await Promise.all([
    supabase.from("profiles").select(columns).eq("open_to_collaborate", true).neq("name", "").order("updated_at", { ascending: false }).limit(candidatePool),
    connections.size > 0 ? supabase.from("profiles").select(columns).in("id", [...connections]) : { data: [] },
  ]);
  const people = new Map([...(open.data ?? []), ...(connected.data ?? [])].map((p) => [p.id, p as Candidate]));
  const excluded = new Set([team.owner_id, ...applications.map((a) => a.user_id)]);
  // The team's languages, else the owner's
  const languages = team.languages.length > 0 ? team.languages : (team.owner?.languages ?? []);
  return Object.fromEntries(openRoles({ roles: team.roles, team_applications: applications }).map((role) => [role, inviteSuggestions(role, [...people.values()], { excluded, connections, languages })]));
}
