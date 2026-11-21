import { knownRoles } from "./roles";

// Skills that show someone can fill each role (names from lib/skills.ts)
export const ROLE_SKILLS: Record<string, string[]> = {
  Frontend: ["JavaScript", "TypeScript", "React", "Next.js", "Vue", "UI/UX Design"],
  Backend: ["Node.js", "Python", "FastAPI", "Django", "Go", "Rust", "Java", "C++", "SQL", "PostgreSQL", "MongoDB", "Redis", "AWS", "GCP", "Docker"],
  "Full-stack": ["JavaScript", "TypeScript", "React", "Next.js", "Vue", "Node.js", "Python", "Django", "SQL", "PostgreSQL"],
  iOS: ["Swift", "Flutter"],
  Android: ["Kotlin", "Java", "Flutter"],
  "ML / AI": ["Machine Learning", "Computer Vision", "NLP", "Python", "Data Science"],
  Data: ["Data Science", "SQL", "Python", "Machine Learning", "PostgreSQL"],
  Designer: ["Figma", "UI/UX Design"],
  "Product / PM": ["Product Management", "UI/UX Design", "Business Development"],
  Marketing: ["Marketing", "Business Development"],
  Business: ["Business Development", "Finance", "Marketing", "Product Management"],
};

export const INVITE_SUGGESTIONS = 5;

export type Candidate = {
  id: string;
  name: string;
  headline: string;
  avatar_url: string;
  skills: string[];
  languages: string[];
  wanted_roles: string[];
  open_to_collaborate: boolean;
};

// Up to 5 people to invite for `role`, best first: those who want this role, then those with the most skills
// for it, then those who share a language with the team, then those open to a team; name breaks ties.
// `excluded`: the owner, members, and anyone who already applied or was invited (any answer).
// Only people open to a team or among the owner's connections are eligible; the database checks this too.
export function inviteSuggestions(role: string, candidates: Candidate[], { excluded, connections, languages }: { excluded: Set<string>; connections: Set<string>; languages: string[] }) {
  const listed = knownRoles([role])[0];
  const roleSkills = new Set(listed ? ROLE_SKILLS[listed] : []);
  const rank = (c: Candidate) => [
    listed && c.wanted_roles.includes(listed) ? 1 : 0,
    c.skills.filter((s) => roleSkills.has(s)).length,
    c.languages.some((l) => languages.includes(l)) ? 1 : 0,
    c.open_to_collaborate ? 1 : 0,
  ];
  return candidates
    .filter((c) => c.name.trim() !== "" && !excluded.has(c.id) && (c.open_to_collaborate || connections.has(c.id)))
    .map((c) => ({ candidate: c, rank: rank(c) }))
    .sort((a, b) => {
      for (let i = 0; i < a.rank.length; i++) if (a.rank[i] !== b.rank[i]) return b.rank[i] - a.rank[i];
      return a.candidate.name.localeCompare(b.candidate.name);
    })
    .slice(0, INVITE_SUGGESTIONS)
    .map((r) => r.candidate);
}
