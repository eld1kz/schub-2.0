import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { publicClient, requireUser } from "@/lib/supabase/server";
import { myConnections } from "@/lib/connections";
import { openRoles } from "@/lib/teams";
import { inviteSuggestions, type Candidate } from "@/lib/invites";
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
  const [team, applicationRows, connections] = await Promise.all([
    supabase.from("teams").select("id, title, description, roles, role_notes, languages, work_mode, owner_id, owner:profiles(name, avatar_url, headline, open_to_collaborate, languages), opportunity:opportunities(id, title)").eq("id", id).maybeSingle(),
    // Row level security returns accepted members, your own application, and everything if you own the team
    supabase.from("team_applications").select("id, user_id, role, note, status, direction, person:profiles(name, headline, university, skills, avatar_url, open_to_collaborate)").eq("team_id", id).order("created_at"),
    myConnections(supabase, userId, isGuest),
  ]);
  const t = team.data;
  if (!t) notFound();

  const applications = (applicationRows.data ?? []) as unknown as Application[];
  const version = storyVersion({ ...(t as unknown as Team), team_applications: applications });
  const suggestions = t.owner_id === userId && !isGuest ? await inviteCandidates(supabase, t as unknown as Team, applications, connections) : {};
  return <TeamView team={t as unknown as Team} applications={applications} userId={userId} isGuest={isGuest} connections={connections} shareVersion={version} suggestions={suggestions} />;
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
