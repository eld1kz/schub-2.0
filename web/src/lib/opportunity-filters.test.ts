import { describe, expect, it } from "vitest";
import { countryOptions, filtersHref, forYou, forYouLabel, matches, readFilters, sortListings, type Listing } from "./opportunity-filters";

const event = (over: Partial<Listing> & { id: string }): Listing & { id: string } => ({
  type: "hackathon", country: null, online: false, languages: [], eligibility: "anyone", featured: false,
  created_at: "2026-11-01T00:00:00Z", looking: 0, date: null, ...over,
});

const seoul = event({ id: "seoul", country: "KR", languages: ["Korean"], date: "2026-12-10", looking: 2 });
const online = event({ id: "online", online: true, languages: ["English"], date: "2026-12-05", created_at: "2026-11-20T00:00:00Z" });
const tokyo = event({ id: "tokyo", type: "competition", country: "JP", languages: ["Japanese"], date: "2026-12-01", looking: 9 });
const kOnly = event({ id: "k-only", type: "grant", country: "KR", languages: ["Korean"], eligibility: "country", date: "2027-01-01" });
const unknown = event({ id: "unknown", date: null, featured: true });
const all = [seoul, online, tokyo, kOnly, unknown];

const none = readFilters({});
const korean = { country: "KR", languages: ["Korean", "English"] };
const ids = (list: { id: string }[]) => list.map((o) => o.id);

describe("readFilters and filtersHref", () => {
  it("reads only known values and writes them back", () => {
    const f = readFilters({ type: "hackathon", country: "KR", lang: "Korean", canjoin: "1", sort: "newest", all: "1" });
    expect(f).toEqual({ type: "hackathon", country: "KR", lang: "Korean", canJoin: true, sort: "newest", all: true });
    expect(filtersHref(f)).toBe("/opportunities?type=hackathon&country=KR&lang=Korean&canjoin=1&sort=newest&all=1");
    expect(readFilters({ type: "party", country: "korea", lang: "Klingon", sort: "random" })).toEqual(none);
    expect(filtersHref(none)).toBe("/opportunities");
  });
});

describe("for you", () => {
  it("applies to a member with a country or languages who picked no place or language", () => {
    expect(forYou(none, korean)).toBe(true);
    expect(forYou(none, null)).toBe(false);
    expect(forYou(none, { country: null, languages: [] })).toBe(false);
    expect(forYou({ ...none, all: true }, korean)).toBe(false);
    expect(forYou({ ...none, lang: "Korean" }, korean)).toBe(false);
    // Type and sort don't turn it off
    expect(forYou({ ...none, type: "grant", sort: "looking" }, korean)).toBe(true);
  });

  it("shows your country, online and unknown places, in your languages or unknown ones", () => {
    expect(ids(all.filter((o) => matches(o, none, korean)))).toEqual(["seoul", "online", "k-only", "unknown"]);
    expect(ids(all.filter((o) => matches(o, none, { country: null, languages: ["Japanese"] })))).toEqual(["tokyo", "unknown"]);
  });

  it("says what it shows", () => {
    expect(forYouLabel(korean)).toBe("South Korea or online, in Korean or English");
    expect(forYouLabel({ country: null, languages: ["Russian"] })).toBe("in Russian");
  });
});

describe("matches", () => {
  it("filters by country, online, language and type", () => {
    expect(ids(all.filter((o) => matches(o, { ...none, country: "KR" }, null)))).toEqual(["seoul", "k-only"]);
    expect(ids(all.filter((o) => matches(o, { ...none, country: "online" }, null)))).toEqual(["online"]);
    expect(ids(all.filter((o) => matches(o, { ...none, lang: "Japanese" }, null)))).toEqual(["tokyo"]);
    expect(ids(all.filter((o) => matches(o, { ...none, type: "grant" }, null)))).toEqual(["k-only"]);
  });

  it("Can I join? hides events restricted to a country you're not in", () => {
    const f = { ...none, canJoin: true, all: true };
    expect(ids(all.filter((o) => matches(o, f, korean)))).toContain("k-only");
    expect(ids(all.filter((o) => matches(o, f, { country: "JP", languages: [] })))).not.toContain("k-only");
    // Nowhere known: every restricted one is hidden
    expect(ids(all.filter((o) => matches(o, f, null)))).not.toContain("k-only");
  });

  it("leaves out one filter for that filter's counts", () => {
    const f = { ...none, type: "grant" as const, country: "JP" };
    expect(all.filter((o) => matches(o, f, null, "type")).length).toBe(1);
    expect(all.filter((o) => matches(o, f, null, "country")).length).toBe(1);
  });
});

describe("sortListings", () => {
  it("by deadline: featured first, then the soonest, no date last", () => {
    expect(ids(sortListings(all, "deadline"))).toEqual(["unknown", "tokyo", "online", "seoul", "k-only"]);
  });

  it("by newest and by most people looking", () => {
    expect(ids(sortListings(all, "newest"))[0]).toBe("online");
    expect(ids(sortListings(all, "looking")).slice(0, 2)).toEqual(["tokyo", "seoul"]);
  });
});

describe("countryOptions", () => {
  it("lists online, Korea, then countries with events, with counts", () => {
    expect(countryOptions(all)).toEqual([
      { value: "online", label: "Online / worldwide", count: 1 },
      { value: "KR", label: "South Korea", count: 2 },
      { value: "JP", label: "Japan", count: 1 },
    ]);
    expect(countryOptions([]).map((o) => o.value)).toEqual(["online", "KR"]);
  });
});
