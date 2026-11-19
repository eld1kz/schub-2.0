import { describe, expect, it } from "vitest";
import { matchReason, matchScore, parseList } from "./match";

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

describe("matchReason", () => {
  it("says nothing until you have skills", () => {
    expect(matchReason(person(["Go"]), person([]))).toBe("");
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
