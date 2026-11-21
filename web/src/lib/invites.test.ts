import { describe, expect, it } from "vitest";
import { INVITE_SUGGESTIONS, inviteSuggestions, ROLE_SKILLS, type Candidate } from "./invites";
import { ROLES } from "./roles";
import { SKILLS } from "./skills";

const person = (id: string, over: Partial<Candidate> = {}): Candidate => ({
  id,
  name: `Person ${id}`,
  headline: "",
  avatar_url: "",
  skills: [],
  languages: [],
  wanted_roles: [],
  open_to_collaborate: true,
  ...over,
});
const none = { excluded: new Set<string>(), connections: new Set<string>(), languages: [] as string[] };
const ids = (list: Candidate[]) => list.map((c) => c.id);

describe("inviteSuggestions", () => {
  it("ranks wanting the role first, then skills for it, then a shared language, then being open", () => {
    const candidates = [
      person("open-only"),
      person("speaks", { languages: ["Korean"] }),
      person("skills", { skills: ["Figma", "UI/UX Design"] }),
      person("one-skill", { skills: ["Figma"] }),
      person("wants", { wanted_roles: ["Designer"] }),
      person("connection", { open_to_collaborate: false }),
    ];
    const ranked = inviteSuggestions("Designer", candidates, { ...none, connections: new Set(["connection"]), languages: ["Korean"] });
    expect(ids(ranked)).toEqual(["wants", "skills", "one-skill", "speaks", "open-only"]);
  });

  it("only suggests people open to a team or your connections, never excluded or unnamed people", () => {
    const candidates = [person("closed", { open_to_collaborate: false }), person("friend", { open_to_collaborate: false }), person("member"), person("blank", { name: " " }), person("ok")];
    expect(ids(inviteSuggestions("Backend", candidates, { ...none, excluded: new Set(["member"]), connections: new Set(["friend"]) }))).toEqual(["ok", "friend"]);
  });

  it("returns at most 5, breaking ties by name", () => {
    const many = ["f", "e", "d", "c", "b", "a"].map((id) => person(id));
    expect(ids(inviteSuggestions("Data", many, none))).toEqual(["a", "b", "c", "d", "e"]);
    expect(INVITE_SUGGESTIONS).toBe(5);
  });

  it("works for old typed-in roles, by language and openness only", () => {
    const ranked = inviteSuggestions("Hardware hacker", [person("a", { wanted_roles: ["Designer"], skills: ["Figma"] }), person("b", { languages: ["English"] })], { ...none, languages: ["English"] });
    expect(ids(ranked)).toEqual(["b", "a"]);
  });
});

describe("ROLE_SKILLS", () => {
  it("covers every role, with skills from the skill list", () => {
    expect(Object.keys(ROLE_SKILLS).sort()).toEqual([...ROLES].sort());
    for (const skills of Object.values(ROLE_SKILLS)) for (const s of skills) expect(SKILLS).toContain(s);
  });
});
