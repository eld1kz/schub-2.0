import { teamSlots } from "@/lib/teams";
import type { Slot } from "@/components/ui";

type Person = { name: string; avatar_url: string; open_to_collaborate: boolean };

// A team row from the database as TeamSlots draws it: your connections ringed in the accent, others open to a team
// in green, and your own slot marked
export function toSlots(
  team: { owner_id: string; roles: string[]; owner: Person | null; team_applications: { role: string; status: string; user_id: string; person: Person | null }[] },
  userId: string,
  connections: Set<string> = new Set(),
): Slot[] {
  const withIds = {
    roles: team.roles,
    owner: team.owner && { ...team.owner, id: team.owner_id },
    team_applications: team.team_applications.map((a) => ({ role: a.role, status: a.status, person: a.person && { ...a.person, id: a.user_id } })),
  };
  return teamSlots(withIds).map(({ id, role, filled, person }) => ({
    id,
    role,
    filled,
    member: person
      ? {
          id: person.id,
          name: person.name,
          avatar_url: person.avatar_url,
          ring: connections.has(person.id) ? ("connection" as const) : person.open_to_collaborate ? ("open" as const) : null,
          you: person.id === userId,
        }
      : undefined,
  }));
}
