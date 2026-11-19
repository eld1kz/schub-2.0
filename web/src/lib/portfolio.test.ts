import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { formatPeriod, mediaPath, mediaUrl, sortExperiences, toLink, webLink } from "./portfolio";

describe("formatPeriod", () => {
  const now = new Date("2026-11-19T12:00:00Z");

  it("counts both the first and the last month, like LinkedIn", () => {
    expect(formatPeriod("2025-03-01", "2026-11-01")).toBe("Mar 2025 – Nov 2026 · 1 yr 9 mos");
    expect(formatPeriod("2025-03-01", "2025-03-01")).toBe("Mar 2025 – Mar 2025 · 1 mo");
    expect(formatPeriod("2025-01-01", "2025-12-01")).toBe("Jan 2025 – Dec 2025 · 1 yr");
    expect(formatPeriod("2023-01-01", "2025-02-01")).toBe("Jan 2023 – Feb 2025 · 2 yrs 2 mos");
  });

  it("runs to today when there's no end", () => {
    expect(formatPeriod("2025-03-01", null, now)).toBe("Mar 2025 – Present · 1 yr 9 mos");
  });

  it("doesn't shift a month in time zones west of UTC", () => {
    // new Date("2025-03-01") is midnight UTC; local-time getters would read February in the Americas
    expect(formatPeriod("2025-03-01", "2025-04-01")).toBe("Mar 2025 – Apr 2025 · 2 mos");
  });

  it("leaves the length off when the end is before the start", () => {
    expect(formatPeriod("2026-05-01", "2026-01-01")).toBe("May 2026 – Jan 2026");
  });
});

describe("sortExperiences", () => {
  it("puts current roles first, then the newest start", () => {
    const sorted = sortExperiences([
      { id: "old", start_date: "2020-01-01", end_date: "2021-01-01" },
      { id: "new", start_date: "2024-01-01", end_date: "2024-06-01" },
      { id: "current", start_date: "2019-01-01", end_date: null },
    ]);
    expect(sorted.map((e) => e.id)).toEqual(["current", "new", "old"]);
  });
});

describe("links typed in by users", () => {
  it("toLink only ever produces http(s) links", () => {
    expect(toLink("github.com/me")).toBe("https://github.com/me");
    expect(toLink("me", "https://github.com/")).toBe("https://github.com/me");
    expect(toLink("@me", "https://github.com/")).toBe("https://github.com/me");
    expect(toLink("http://example.com")).toBe("http://example.com/");
    expect(toLink("javascript:alert(1)")).toBe("");
    expect(toLink("javascript://example.com/%0aalert(1)")).toBe("");
    expect(toLink("data:text/html,<script>alert(1)</script>")).toBe("");
    expect(toLink("")).toBe("");
  });

  it("webLink refuses anything that isn't http(s)", () => {
    expect(webLink("https://example.com")).toBe("https://example.com");
    expect(webLink("HTTP://example.com")).toBe("HTTP://example.com");
    expect(webLink("javascript:alert(1)")).toBeNull();
    expect(webLink(" javascript:alert(1)")).toBeNull();
    expect(webLink("data:text/html,x")).toBeNull();
    expect(webLink("//evil.com")).toBeNull();
    expect(webLink("")).toBeNull();
  });
});

describe("mediaUrl", () => {
  const original = process.env.NEXT_PUBLIC_SUPABASE_URL;
  beforeEach(() => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://abc.supabase.co";
  });
  afterEach(() => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = original;
  });

  it("only allows images from our own media bucket", () => {
    const own = "https://abc.supabase.co/storage/v1/object/public/media/u1/x.png";
    expect(mediaUrl(own)).toBe(own);
    expect(mediaUrl("https://tracker.example.com/pixel.png")).toBeNull();
    expect(mediaUrl("https://abc.supabase.co.evil.com/storage/v1/object/public/media/x.png")).toBeNull();
    expect(mediaUrl("javascript:alert(1)")).toBeNull();
    expect(mediaUrl(null)).toBeNull();
  });

  it("mediaPath gives the file's place in the bucket, only for our own images", () => {
    expect(mediaPath("https://abc.supabase.co/storage/v1/object/public/media/u1/x.png")).toBe("u1/x.png");
    expect(mediaPath("https://abc.supabase.co/storage/v1/object/public/media/u1/a%20b.png")).toBe("u1/a b.png");
    expect(mediaPath("https://example.com/storage/v1/object/public/media/u1/x.png")).toBeNull();
    expect(mediaPath("")).toBeNull();
  });
});
