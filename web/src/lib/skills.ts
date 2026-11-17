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
