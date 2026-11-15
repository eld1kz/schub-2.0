export type TeamSummary = {
  id: string;
  title: string;
  description: string;
  roles: string[];
  owner_id: string;
  owner: { id: string; name: string } | null;
  opportunity: { id: string; title: string } | null;
  team_applications: { role: string; status: string }[];
};

export const teamSummaryColumns =
  "id, title, description, roles, owner_id, owner:profiles(id, name), opportunity:opportunities(id, title), team_applications(role, status)";

// A role is open until someone has been accepted for it.
export function openRoles(team: { roles: string[]; team_applications: { role: string; status: string }[] }) {
  const filled = new Set(team.team_applications.filter((a) => a.status === "accepted").map((a) => a.role));
  return team.roles.filter((r) => !filled.has(r));
}
