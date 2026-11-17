// What someone is on Schub for (profiles.goals). The database only accepts these values.
export const GOALS = ["Hackathon team", "Side project collaborator", "Startup co-founder", "Internship / job referral"];

export function knownGoals(values: unknown[]) {
  return GOALS.filter((g) => values.includes(g));
}
