// A team's shared project (supabase/shared-projects.sql): what the team built, on every member's profile.

export type SharedProjectPerson = { id: string; name: string; avatar_url: string };

export type SharedProject = {
  id: string;
  team_id: string;
  title: string;
  pitch: string;
  image_url: string;
  url: string;
  repo_url: string;
  result: string;
  team: { id: string; title: string; owner_id: string; opportunity_id: string | null } | null;
  // Row level security returns confirmed members, plus your own row and, for the team's owner, every row
  team_project_members: { user_id: string; status: "pending" | "confirmed" | "declined"; hidden: boolean; person: SharedProjectPerson | null }[];
};

export const sharedProjectColumns =
  "id, team_id, title, pitch, image_url, url, repo_url, result, team:teams(id, title, owner_id, opportunity_id), " +
  "team_project_members(user_id, status, hidden, person:profiles(id, name, avatar_url))";

export const SHARED_PROJECT_TITLE_MAX = 80;
export const SHARED_PROJECT_PITCH_MAX = 200;
export const SHARED_PROJECT_RESULT_MAX = 60;

// Everyone who confirmed, the owner first, leaving out `except`
export function builtWith(project: SharedProject, except?: string) {
  const owner = project.team?.owner_id;
  return project.team_project_members
    .filter((m) => m.status === "confirmed" && m.person && m.user_id !== except)
    .sort((a, b) => Number(b.user_id === owner) - Number(a.user_id === owner))
    .map((m) => m.person as SharedProjectPerson);
}
