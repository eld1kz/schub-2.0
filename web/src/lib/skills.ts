// The fixed list people pick their skills from, grouped the way profiles show them.
export const skillGroups = {
  Frontend: ["JavaScript", "TypeScript", "React", "Next.js", "Swift", "Kotlin", "Flutter"],
  Backend: ["Node.js", "Python", "Go", "Rust", "SQL", "PostgreSQL", "MongoDB", "Redis", "AWS", "Docker"],
  Design: ["Figma", "UI/UX Design"],
  Other: ["Machine Learning", "Data Science", "Blockchain", "Solidity", "Product Management", "Marketing", "Business Development"],
};

export const allSkills = Object.values(skillGroups).flat();

const byLowercase = new Map(allSkills.map((s) => [s.toLowerCase(), s]));

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
