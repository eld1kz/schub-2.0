import { describe, expect, it } from "vitest";
import { skillEvidence } from "./skills";

describe("skillEvidence", () => {
  const projects = [{ skills: ["React", "Figma"] }, { skills: ["react"] }, { skills: ["React", "Python"] }];
  const roles = [{ skills: ["React"] }, { skills: ["Python", "SQL"] }];

  it("counts projects and roles per skill, ignoring case", () => {
    const [frontend] = skillEvidence(["React"], projects, roles);
    expect(frontend.skills).toEqual([{ name: "React", uses: "3 projects · 1 role", top: true }]);
  });

  it("puts used skills first in each group, most used first, and marks the top 3 overall (ties go to the one listed first)", () => {
    const groups = skillEvidence(["Go", "SQL", "Python", "Figma", "React", "Vue"], projects, roles);
    expect(groups.map((g) => [g.name, g.skills.map((s) => [s.name, s.uses, s.top])])).toEqual([
      ["Frontend", [["React", "3 projects · 1 role", true], ["Vue", "", false]]],
      ["Backend", [["Python", "1 project · 1 role", true], ["SQL", "1 role", true], ["Go", "", false]]],
      ["Design", [["Figma", "1 project", false]]],
    ]);
  });

  it("marks nothing as top when no skill is used anywhere", () => {
    const [frontend] = skillEvidence(["React", "Vue"], [], []);
    expect(frontend.skills.every((s) => !s.top && s.uses === "")).toBe(true);
  });
});
