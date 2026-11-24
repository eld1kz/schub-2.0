import type { createClient } from "@/lib/supabase/server";

// The allowed values of awards.placement (supabase/awards.sql), best first. This order ranks awards.
export const PLACEMENTS = ["Winner", "1st", "2nd", "3rd", "Track winner", "Special prize", "Finalist", "Honorable mention"];

export const AWARD_DESCRIPTION_MAX = 300;
export const AWARD_TEAMMATES_MAX = 10;

// "1st" reads "1st place"; the rest read as they are
export const placementLabel = (placement: string) => (["1st", "2nd", "3rd"].includes(placement) ? `${placement} place` : placement);

export type AwardPerson = { id: string; name: string; avatar_url: string };

export type Award = {
  id: string;
  user_id: string;
  placement: string;
  prize_name: string;
  opportunity_id: string | null;
  event_name: string;
  awarded_on: string;
  project_id: string | null;
  team_id: string | null;
  proof_url: string;
  description: string;
  // Null when the opportunity is gone or hidden; event_name still has its name
  opportunity: { id: string; title: string } | null;
  project: { id: string; title: string } | null;
  team: { id: string; team_entries: { opportunity_id: string }[] } | null;
  owner: AwardPerson | null;
  // Row level security returns confirmed teammates, plus every tag to the owner and your own tag to you
  award_teammates: { user_id: string; status: "pending" | "confirmed" | "declined"; person: AwardPerson | null }[];
};

// awards → profiles is ambiguous (the owner, or the teammates through award_teammates), hence the hints
export const awardColumns =
  "id, user_id, placement, prize_name, opportunity_id, event_name, awarded_on, project_id, team_id, proof_url, description, " +
  "opportunity:opportunities(id, title), project:projects(id, title), team:teams(id, team_entries(opportunity_id)), " +
  "owner:profiles!user_id(id, name, avatar_url), award_teammates(user_id, status, person:profiles!user_id(id, name, avatar_url))";

export const confirmedTeammates = (a: Award) => a.award_teammates.filter((t) => t.status === "confirmed");

// The team was put together on Schub and entered this same event
export const formedOnSchub = (a: Award) => Boolean(a.opportunity_id && a.team?.team_entries.some((e) => e.opportunity_id === a.opportunity_id));

// Best placement first, then the most recent
export function byRank(a: Award, b: Award) {
  return PLACEMENTS.indexOf(a.placement) - PLACEMENTS.indexOf(b.placement) || b.awarded_on.localeCompare(a.awarded_on);
}

// Everyone with an award: owners, and teammates who confirmed one
export async function awardedIds(supabase: Awaited<ReturnType<typeof createClient>>) {
  const [owners, teammates] = await Promise.all([
    supabase.from("awards").select("user_id"),
    supabase.from("award_teammates").select("user_id").eq("status", "confirmed"),
  ]);
  return new Set([...(owners.data ?? []), ...(teammates.data ?? [])].map((r) => r.user_id as string));
}
