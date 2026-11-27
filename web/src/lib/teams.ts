import type { createClient } from "@/lib/supabase/server";
import { hasEnded, lastDay, nextDate } from "@/lib/opportunities";

type Client = Awaited<ReturnType<typeof createClient>>;

// A team member as rows show them; all of it is public on profiles
export type Member = { id: string; name: string; avatar_url: string; university: string; open_to_collaborate: boolean };

// How far a team got in an event it entered (supabase/team-entries.sql), in order
export const ENTRY_STATUSES = { going: "Going", registered: "Registered", submitted: "Submitted", placed: "Placed" } as const;
export type EntryStatus = keyof typeof ENTRY_STATUSES;
export const isEntryStatus = (s: unknown): s is EntryStatus => typeof s === "string" && Object.hasOwn(ENTRY_STATUSES, s);

// `url`: the official page, where teams register
export type TeamEvent = { id: string; title: string; url: string; deadline: string | null; starts_at: string | null; ends_at: string | null };
// `opportunity` is null when the event can't be read (hidden after reports, or removed)
export type Entry = { status: EntryStatus; created_at: string; opportunity: TeamEvent | null };
export const entryColumns = "status, created_at, opportunity:opportunities(id, title, url, deadline, starts_at, ends_at)";

// A team's current event: its soonest upcoming entry, else the one that ended last; null with no entries
export function currentEntry(entries: Entry[], day: string) {
  const listed = entries.filter((e): e is Entry & { opportunity: TeamEvent } => e.opportunity !== null);
  const next = (e: { opportunity: TeamEvent }) => nextDate(e.opportunity, day).date ?? "9999";
  const upcoming = listed.filter((e) => !hasEnded(e.opportunity, day)).sort((a, b) => next(a).localeCompare(next(b)));
  if (upcoming.length > 0) return upcoming[0];
  return listed.sort((a, b) => (lastDay(b.opportunity) ?? "").localeCompare(lastDay(a.opportunity) ?? ""))[0] ?? null;
}

// Adds the team's current event as `opportunity`, which rows, share images and filters show
export function withCurrentEvent<T extends { team_entries: Entry[] }>(team: T, day: string): T & { opportunity: TeamEvent | null } {
  return { ...team, opportunity: currentEntry(team.team_entries, day)?.opportunity ?? null };
}

export type TeamSummary = {
  id: string;
  title: string;
  roles: string[];
  // Working languages and work mode (lib/languages.ts); empty when not given
  languages: string[];
  work_mode: string;
  owner_id: string;
  owner: Member | null;
  // Every event the team entered, and the current one (withCurrentEvent)
  team_entries: Entry[];
  opportunity: TeamEvent | null;
  // Everyone sees accepted applications; owners also see pending ones to their team. An accepted invite is a
  // member like an accepted application (supabase/team-invites.sql).
  team_applications: { role: string; status: string; direction: string; user_id: string; person: Member | null }[];
};

const member = "id, name, avatar_url, university, open_to_collaborate";
export const teamSummaryColumns =
  `id, title, roles, languages, work_mode, owner_id, owner:profiles(${member}), team_entries(${entryColumns}), team_applications(role, status, direction, user_id, person:profiles(${member}))`;

// Rows from a teamSummaryColumns query, each with its current event
export const teamSummaries = (data: unknown, day: string) => ((data ?? []) as Omit<TeamSummary, "opportunity">[]).map((t) => withCurrentEvent(t, day));

// A role is open until someone has been accepted for it.
export function openRoles(team: { roles: string[]; team_applications: { role: string; status: string }[] }) {
  const filled = new Set(team.team_applications.filter((a) => a.status === "accepted").map((a) => a.role));
  return team.roles.filter((r) => !filled.has(r));
}

// The open roles a team is recruiting for: none once its event is over. `eventId` picks the event (on an event's
// page); otherwise it's the team's current one. Teams without an event keep recruiting.
export function recruitingRoles(team: { roles: string[]; team_applications: { role: string; status: string }[]; team_entries: Entry[]; opportunity: TeamEvent | null }, day: string, eventId?: string) {
  const event = eventId ? (team.team_entries.find((e) => e.opportunity?.id === eventId)?.opportunity ?? null) : team.opportunity;
  return event && hasEnded(event, day) ? [] : openRoles(team);
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
export function teamRank(team: TeamSummary, lookingFor: Set<string>, connections: Set<string>, day: string) {
  if (recruitingRoles(team, day).length === 0) return 3;
  if (team.opportunity && lookingFor.has(team.opportunity.id)) return 0;
  if (teamMembers(team).some((m) => connections.has(m.id))) return 1;
  return 2;
}

// Universities on a team row: up to two names, otherwise the first and how many more, so the line stays short
export function universitiesLabel(universities: string[]) {
  return universities.length <= 2 ? universities.join(", ") : `${universities[0]} + ${universities.length - 1} more`;
}

// Your teams, for an event's actions: the ones you started, then the ones you're on, with the events each entered
export type MyTeam = {
  id: string;
  title: string;
  owner: boolean;
  roles: string[];
  team_applications: { role: string; status: string }[];
  team_entries: { opportunity_id: string; status: EntryStatus }[];
};

// Your team in an event: one you started, else one you're on
export type MyEntry = { teamId: string; title: string; status: EntryStatus; owner: boolean };
// One of your teams that hasn't entered an event yet: its open roles, and the ones someone was accepted for
export type EnterableTeam = { id: string; title: string; open: string[]; filled: string[] };

export async function myTeams(supabase: Client, userId: string): Promise<MyTeam[]> {
  const columns = "id, title, roles, owner_id, team_applications(role, status), team_entries(opportunity_id, status)";
  const [owned, joined] = await Promise.all([
    supabase.from("teams").select(columns).eq("owner_id", userId).order("created_at", { ascending: false }),
    supabase.from("team_applications").select(`team:teams(${columns})`).eq("user_id", userId).eq("status", "accepted"),
  ]);
  type Row = Omit<MyTeam, "owner"> & { owner_id: string };
  const rows = [...((owned.data ?? []) as unknown as Row[]), ...((joined.data ?? []) as unknown as { team: Row | null }[]).flatMap((a) => (a.team ? [a.team] : []))];
  return rows.map(({ owner_id, ...t }) => ({ ...t, owner: owner_id === userId }));
}

// For one event: your team in it, and your teams that could still enter it
export function eventState(teams: MyTeam[], eventId: string): { entered: MyEntry | null; enterable: EnterableTeam[] } {
  const entryIn = (t: MyTeam) => t.team_entries.find((e) => e.opportunity_id === eventId);
  const mine = teams.find((t) => t.owner && entryIn(t)) ?? teams.find((t) => entryIn(t));
  const status = mine && entryIn(mine)?.status;
  const entered = mine && status ? { teamId: mine.id, title: mine.title, status, owner: mine.owner } : null;
  const enterable = teams
    .filter((t) => t.owner && !entryIn(t))
    .map((t) => {
      const open = openRoles(t);
      return { id: t.id, title: t.title, open, filled: t.roles.filter((r) => !open.includes(r)) };
    });
  return { entered, enterable };
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

// The team's slots (TeamSlots): its owner, then one per role in the team's order, filled by whoever was accepted for
// it, then anyone accepted for a role that's no longer listed
export function teamSlots<P>(team: { roles: string[]; owner: P | null; team_applications: { role: string; status: string; person: P | null }[] }, ownerRole = "Lead") {
  const accepted = team.team_applications.filter((a) => a.status === "accepted");
  const unlisted = [...new Set(accepted.map((a) => a.role).filter((r) => !team.roles.includes(r)))];
  return [
    { id: "owner", role: ownerRole, filled: true, person: team.owner },
    ...[...team.roles, ...unlisted].flatMap((role) => {
      const people = accepted.filter((a) => a.role === role);
      if (people.length === 0) return [{ id: `role:${role}`, role, filled: false, person: null as P | null }];
      return people.map((a, i) => ({ id: i === 0 ? `role:${role}` : `role:${role}:${i}`, role, filled: true, person: a.person }));
    }),
  ];
}
