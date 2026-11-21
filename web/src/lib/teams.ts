import type { createClient } from "@/lib/supabase/server";

type Client = Awaited<ReturnType<typeof createClient>>;

// A team member as rows show them; all of it is public on profiles
export type Member = { id: string; name: string; avatar_url: string; university: string; open_to_collaborate: boolean };

export type TeamSummary = {
  id: string;
  title: string;
  roles: string[];
  // Working languages and work mode (lib/languages.ts); empty when not given
  languages: string[];
  work_mode: string;
  owner_id: string;
  owner: Member | null;
  opportunity: { id: string; title: string; deadline: string | null; starts_at: string | null; ends_at: string | null } | null;
  // Everyone sees accepted applications; owners also see pending ones to their team. An accepted invite is a
  // member like an accepted application (supabase/team-invites.sql).
  team_applications: { role: string; status: string; direction: string; user_id: string; person: Member | null }[];
};

const member = "id, name, avatar_url, university, open_to_collaborate";
export const teamSummaryColumns =
  `id, title, roles, languages, work_mode, owner_id, owner:profiles(${member}), opportunity:opportunities(id, title, deadline, starts_at, ends_at), team_applications(role, status, direction, user_id, person:profiles(${member}))`;

// A role is open until someone has been accepted for it.
export function openRoles(team: { roles: string[]; team_applications: { role: string; status: string }[] }) {
  const filled = new Set(team.team_applications.filter((a) => a.status === "accepted").map((a) => a.role));
  return team.roles.filter((r) => !filled.has(r));
}

// The owner, then everyone accepted
export function teamMembers(team: TeamSummary) {
  const accepted = team.team_applications.filter((a) => a.status === "accepted").map((a) => a.person);
  return [team.owner, ...accepted].filter((m): m is Member => m !== null);
}

// How a row introduces the team: led by the first of your connections on it, otherwise the owner,
// then everyone else, and each university once
export function memberSummary(members: Member[], connections: Set<string>) {
  const lead = members.find((m) => connections.has(m.id)) ?? members[0] ?? null;
  const universities = new Map(members.map((m) => m.university.trim()).filter(Boolean).map((u) => [u.toLowerCase(), u]));
  return {
    lead,
    connected: lead !== null && connections.has(lead.id),
    others: Math.max(0, members.length - 1),
    ordered: lead ? [lead, ...members.filter((m) => m !== lead)] : [],
    universities: [...universities.values()],
  };
}

// Find teams order: teams for events you're looking for a team on, then teams with one of your connections,
// then the rest; full teams last
export function teamRank(team: TeamSummary, lookingFor: Set<string>, connections: Set<string>) {
  if (openRoles(team).length === 0) return 3;
  if (team.opportunity && lookingFor.has(team.opportunity.id)) return 0;
  if (teamMembers(team).some((m) => connections.has(m.id))) return 1;
  return 2;
}

// Universities on a team row: up to two names, otherwise the first and how many more, so the line stays short
export function universitiesLabel(universities: string[]) {
  return universities.length <= 2 ? universities.join(", ") : `${universities[0]} + ${universities.length - 1} more`;
}

// What waits on you in Your teams: applications to your teams, and invitations to you. Pending applications you
// can see that aren't yours are the ones to your own teams; pending invites to you are yours.
export async function teamsWaiting(supabase: Client, userId: string) {
  const [applications, invites] = await Promise.all([
    supabase.from("team_applications").select("id", { count: "exact", head: true }).eq("status", "pending").eq("direction", "application").neq("user_id", userId),
    supabase.from("team_applications").select("id", { count: "exact", head: true }).eq("status", "pending").eq("direction", "invite").eq("user_id", userId),
  ]);
  return (applications.count ?? 0) + (invites.count ?? 0);
}
