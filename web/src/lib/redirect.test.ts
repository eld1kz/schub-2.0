import { describe, expect, it } from "vitest";
import { localPath, safeRedirect } from "./redirect";

describe("localPath", () => {
  it("keeps a path on this site and drops anything else", () => {
    expect(localPath("/teams/1?tab=mine")).toBe("/teams/1?tab=mine");
    expect(localPath("//evil.com/x")).toBe("/");
    expect(localPath("https://evil.com")).toBe("/");
    expect(localPath(null)).toBe("/");
  });
});

const origin = "https://schub.example";
const to = (next: string | null) => safeRedirect(next, origin).href;

describe("safeRedirect", () => {
  it("keeps pages on this site, with their query", () => {
    expect(to("/teams/123?tab=mine")).toBe(`${origin}/teams/123?tab=mine`);
    expect(to(`${origin}/people`)).toBe(`${origin}/people`);
    // Same-scheme relative: a path on this site, not a host
    expect(to("https:evil.com")).toBe(`${origin}/evil.com`);
  });

  it("goes home when there's no next", () => {
    expect(to(null)).toBe(`${origin}/`);
  });

  it("refuses other sites, however they're written", () => {
    for (const next of [
      "https://evil.com",
      "//evil.com",
      "///evil.com",
      "/\\evil.com",
      "\\\\evil.com",
      " //evil.com",
      "\t//evil.com",
      "https://schub.example.evil.com/",
      "https://schub.example@evil.com/",
      "http://schub.example/",
      "javascript:alert(1)",
      "data:text/html,x",
    ]) {
      expect(to(next), next).toBe(`${origin}/`);
    }
  });

  it("goes home instead of failing on something that isn't a URL", () => {
    expect(to("http://")).toBe(`${origin}/`);
  });
});
