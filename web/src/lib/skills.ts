// The fixed list people pick their skills from, grouped the way profiles show them.
export const skillGroups = {
  Frontend: ["JavaScript", "TypeScript", "React", "Next.js", "Vue", "Swift", "Kotlin", "Flutter"],
  Backend: ["Node.js", "Python", "FastAPI", "Django", "Go", "Rust", "Java", "C++", "SQL", "PostgreSQL", "MongoDB", "Redis", "AWS", "GCP", "Docker"],
  Design: ["Figma", "UI/UX Design"],
  Other: [
    "Machine Learning", "Data Science", "Computer Vision", "NLP", "Blockchain", "Solidity",
    "Product Management", "Marketing", "Business Development", "Finance",
  ],
};

export const SKILLS = Object.values(skillGroups).flat();

const byLowercase = new Map(SKILLS.map((s) => [s.toLowerCase(), s]));

// Keeps only skills from the list, in their listed spelling: "react" becomes "React", "cooking" is dropped
export function knownSkills(values: unknown[]) {
  return [...new Set(values.flatMap((v) => byLowercase.get(String(v).trim().toLowerCase()) ?? []))];
}

// Skills typed in before the fixed list existed show up under Other, as written
export function groupSkills(skills: string[]) {
  const known = new Set(knownSkills(skills));
  const unknown = skills.filter((s) => !byLowercase.has(s.toLowerCase()));
  return Object.entries(skillGroups)
    .map(([name, list]) => ({ name, skills: [...list.filter((s) => known.has(s)), ...(name === "Other" ? unknown : [])] }))
    .filter((g) => g.skills.length > 0);
}

type WithSkills = { skills: string[] };

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

// The profile's skill groups with where each skill is used: "3 projects · 1 role", from the skills on their
// projects and experience entries. In each group, used skills come first, most used first; the top 3 overall are `top`.
export function skillEvidence(skills: string[], projects: WithSkills[], roles: WithSkills[]) {
  const uses = (items: WithSkills[], skill: string) =>
    items.filter((i) => i.skills.some((s) => s.toLowerCase() === skill.toLowerCase())).length;
  const counted = new Map(skills.map((s) => [s, { projects: uses(projects, s), roles: uses(roles, s) }]));
  const total = (s: string) => (counted.get(s)?.projects ?? 0) + (counted.get(s)?.roles ?? 0);
  const top = new Set(skills.filter((s) => total(s) > 0).sort((a, b) => total(b) - total(a)).slice(0, 3));
  return groupSkills(skills).map((g) => ({
    name: g.name,
    skills: [...g.skills].sort((a, b) => total(b) - total(a)).map((s) => {
      const c = counted.get(s) ?? { projects: 0, roles: 0 };
      const label = [c.projects && plural(c.projects, "project"), c.roles && plural(c.roles, "role")].filter(Boolean).join(" · ");
      return { name: s, uses: label, top: top.has(s) };
    }),
  }));
}
