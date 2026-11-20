import { describe, expect, it } from "vitest";
import { matchReason, matchScore, NO_SHARED_LANGUAGE_PENALTY, parseList, SHARED_LANGUAGE_BONUS } from "./match";

const person = (skills: string[], interests: string[] = []) => ({ skills, interests, open_to_collaborate: true });

describe("matchScore", () => {
  it("counts complementary skills 3, shared interests 2 and shared skills 1, out of what they have", () => {
    const them = person(["React", "Go", "Figma"], ["ai", "games"]);
    const me = person(["React"], ["ai"]);
    // raw = 2 complementary * 3 + 1 interest * 2 + 1 shared skill = 9; max = 3 * 3 + 2 * 2 = 13
    expect(matchScore(them, me)).toEqual({ score: Math.floor(900 / 13), complementary: ["Figma", "Go"] });
  });

  it("ranks someone with skills you lack above someone with the same skills", () => {
    const me = person(["React", "TypeScript"]);
    const complement = matchScore(person(["Python", "SQL"]), me).score;
    const twin = matchScore(person(["React", "TypeScript"]), me).score;
    expect(complement).toBeGreaterThan(twin);
  });

  it("never goes below 15 or above 100", () => {
    expect(matchScore(person(["React"]), person(["React"])).score).toBe(33);
    expect(matchScore(person([]), person(["React"])).score).toBe(15);
    expect(matchScore(person(["Go"]), person([])).score).toBe(100);
  });

  it("sorts complementary skills alphabetically", () => {
    expect(matchScore(person(["Rust", "Go", "C++"]), person([])).complementary).toEqual(["C++", "Go", "Rust"]);
  });
});

describe("matchScore and languages", () => {
  // Shares React and one interest with me, so the base score is well under 100
  const speaks = (languages: string[]) => ({ ...person(["Go", "React"], ["ai", "games"]), languages });
  const me = { ...person(["React"], ["ai"]), languages: ["Korean", "English"] };
  const base = matchScore(person(["Go", "React"], ["ai", "games"]), me).score;

  it("adds a bonus for a shared language", () => {
    expect(base).toBeLessThan(80);
    expect(matchScore(speaks(["English"]), me).score).toBe(base + SHARED_LANGUAGE_BONUS);
  });

  it("takes a lot off when you share no language", () => {
    const them = { ...person(["Go", "Rust", "SQL", "Java"], ["a", "b", "c"]), languages: ["Russian"] };
    const without = matchScore({ ...them, languages: [] }, me).score;
    expect(matchScore(them, me).score).toBe(Math.max(15, without - NO_SHARED_LANGUAGE_PENALTY));
    expect(matchScore(them, me).score).toBeLessThan(without);
  });

  it("changes nothing when either side hasn't said", () => {
    expect(matchScore(speaks([]), me).score).toBe(base);
    expect(matchScore(speaks(["Russian"]), { ...me, languages: [] }).score).toBe(base);
  });

  it("ranks a speaker of your language above an otherwise equal one who isn't", () => {
    const shared = matchScore({ ...person(["Python"], ["ai"]), languages: ["Korean"] }, { ...person(["React"], ["ai"]), languages: ["Korean"] }).score;
    const none = matchScore({ ...person(["Python"], ["ai"]), languages: ["French"] }, { ...person(["React"], ["ai"]), languages: ["Korean"] }).score;
    expect(shared).toBeGreaterThan(none);
  });
});

describe("matchReason", () => {
  it("says nothing until you have skills", () => {
    expect(matchReason(person(["Go"]), person([]))).toBe("");
  });

  it("says when you have no language in common, ahead of anything else", () => {
    expect(matchReason({ ...person(["Go"]), languages: ["Russian"] }, { ...person(["React"]), languages: ["Korean"] })).toBe("No language in common");
    expect(matchReason({ ...person(["Go"]), languages: ["Russian"] }, { ...person(["React"]), languages: [] })).toBe("Has Go — you don't");
  });

  it("prefers skills you lack, then shared interests, then shared skills", () => {
    expect(matchReason(person(["Go", "Rust", "SQL"]), person(["React"]))).toBe("Has Go, Rust — you don't");
    expect(matchReason(person(["React"], ["ai", "games", "x"]), person(["React"], ["games", "ai"]))).toBe("Also into ai, games");
    expect(matchReason(person(["React"]), person(["React"]))).toBe("Also works with React");
  });
});

describe("parseList", () => {
  it("splits on commas, trims, lowercases and drops blanks", () => {
    expect(parseList(" AI, Games ,,  ")).toEqual(["ai", "games"]);
    expect(parseList(null)).toEqual([]);
  });
});
