// The fixed list of team roles: what people say they're open to (profiles.wanted_roles) and what new teams
// pick their open roles from. The database only accepts these values in wanted_roles (supabase/open-to-team.sql).
export const ROLES = ["Frontend", "Backend", "Full-stack", "iOS", "Android", "ML / AI", "Data", "Designer", "Product / PM", "Marketing", "Business"];

// The longest note a team can add to one of its roles
export const ROLE_NOTE_MAX = 80;

const byLowercase = new Map(ROLES.map((r) => [r.toLowerCase(), r]));

// Keeps only roles from the list, in their listed spelling, each once: "frontend" becomes "Frontend", "CTO" is dropped
export function knownRoles(values: unknown[]) {
  return [...new Set(values.flatMap((v) => byLowercase.get(String(v).trim().toLowerCase()) ?? []))];
}

// A new team's open roles from its form: each "roles" value paired with the "role_notes" value at the same position.
// Unknown and repeated roles are dropped; notes are trimmed and cut to ROLE_NOTE_MAX, and empty ones left out.
export function rolesWithNotes(roles: unknown[], notes: unknown[]) {
  const picked: string[] = [];
  const noteFor: Record<string, string> = {};
  roles.forEach((value, i) => {
    const role = knownRoles([value])[0];
    if (!role || picked.includes(role)) return;
    picked.push(role);
    const note = String(notes[i] ?? "").trim().slice(0, ROLE_NOTE_MAX);
    if (note) noteFor[role] = note;
  });
  return { roles: picked, notes: noteFor };
}
