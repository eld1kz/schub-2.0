import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { completionScore } from "./completion";

const photo = "https://abc.supabase.co/storage/v1/object/public/media/u1/me.png";

const empty = {
  avatar_url: "",
  name: "",
  headline: "",
  university: "",
  bio: "",
  skills: [],
  interests: [],
  github: "",
  linkedin: "",
  open_to_collaborate: false,
};

const complete = {
  avatar_url: photo,
  name: "Minji Placeholder",
  headline: "Frontend",
  university: "Korea University",
  bio: "Twenty characters or more.",
  skills: ["React", "TypeScript", "Figma"],
  interests: ["edtech"],
  github: "https://github.com/x",
  linkedin: "",
  open_to_collaborate: true,
};

describe("completionScore", () => {
  const original = process.env.NEXT_PUBLIC_SUPABASE_URL;
  beforeEach(() => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://abc.supabase.co";
  });
  afterEach(() => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = original;
  });

  it("is 0 for an empty profile, with a hint for everything", () => {
    const { score, missing } = completionScore(empty);
    expect(score).toBe(0);
    expect(missing).toHaveLength(9);
  });

  it("is 100 for a complete profile", () => {
    expect(completionScore(complete)).toEqual({ score: 100, missing: [] });
  });

  it("adds up the points of each part", () => {
    expect(completionScore({ ...empty, avatar_url: photo }).score).toBe(15);
    expect(completionScore({ ...empty, name: "A" }).score).toBe(10);
    expect(completionScore({ ...empty, open_to_collaborate: true }).score).toBe(5);
    expect(completionScore({ ...empty, linkedin: "https://linkedin.com/in/x" }).score).toBe(10);
  });

  it("doesn't count a photo from somewhere else, a short bio, blank text or unknown skills", () => {
    expect(completionScore({ ...complete, avatar_url: "https://example.com/me.png" }).score).toBe(85);
    expect(completionScore({ ...complete, bio: "Too short" }).score).toBe(85);
    expect(completionScore({ ...complete, name: "   " }).score).toBe(90);
    expect(completionScore({ ...complete, skills: ["React", "TypeScript", "Cooking"] }).score).toBe(85);
  });
});
