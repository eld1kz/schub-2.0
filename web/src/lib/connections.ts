import type { createClient } from "@/lib/supabase/server";

type Client = Awaited<ReturnType<typeof createClient>>;

// Your accepted connections' ids. Pages load this once and match rows against it in memory.
// Signed-out visitors have none, so they never see a connection signal.
export async function myConnections(supabase: Client, userId: string, isGuest: boolean) {
  if (isGuest) return new Set<string>();
  const { data } = await supabase
    .from("connections")
    .select("sender_id, receiver_id")
    .eq("status", "accepted")
    .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`);
  return new Set((data ?? []).map((c) => (c.sender_id === userId ? c.receiver_id : c.sender_id)));
}

export type Going = { people: Set<string>; onTeam: boolean };

// Per opportunity: which of your connections are going, from who's looking for a team there and who's on a team for it.
// `onTeam` says at least one is on a team, so the link goes to the teams.
export function tallyGoing(looking: { opportunity_id: string; user_id: string }[], onTeams: { opportunity_id: string; user_id: string }[], connections: Set<string>) {
  const going = new Map<string, Going>();
  const add = (opportunityId: string, userId: string, onTeam: boolean) => {
    if (!connections.has(userId)) return;
    const g = going.get(opportunityId) ?? { people: new Set<string>(), onTeam: false };
    g.people.add(userId);
    g.onTeam ||= onTeam;
    going.set(opportunityId, g);
  };
  looking.forEach((r) => add(r.opportunity_id, r.user_id, false));
  onTeams.forEach((r) => add(r.opportunity_id, r.user_id, true));
  return going;
}

// The same for a whole list of opportunities: three queries, whatever the list's length. Only public rows:
// who's looking for a team, and the owners and accepted members of teams entered in each event.
export async function connectionsGoing(supabase: Client, connections: Set<string>) {
  if (connections.size === 0) return new Map<string, Going>();
  const ids = [...connections];
  const [looking, owners, members] = await Promise.all([
    supabase.from("opportunity_participants").select("opportunity_id, user_id").in("user_id", ids),
    supabase.from("teams").select("owner_id, team_entries(opportunity_id)").in("owner_id", ids),
    supabase.from("team_applications").select("user_id, team:teams(team_entries(opportunity_id))").eq("status", "accepted").in("user_id", ids),
  ]);
  type Entered = { team_entries: { opportunity_id: string }[] };
  const onTeams = [
    ...((owners.data ?? []) as unknown as ({ owner_id: string } & Entered)[])
      .flatMap((t) => t.team_entries.map((e) => ({ opportunity_id: e.opportunity_id, user_id: t.owner_id }))),
    ...((members.data ?? []) as unknown as { user_id: string; team: Entered | null }[])
      .flatMap((m) => (m.team?.team_entries ?? []).map((e) => ({ opportunity_id: e.opportunity_id, user_id: m.user_id }))),
  ];
  return tallyGoing(looking.data ?? [], onTeams, connections);
}

// "2 of your connections are going"
export const goingLabel = (n: number) => `${n} of your connections ${n === 1 ? "is" : "are"} going`;
