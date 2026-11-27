// Every importer against a saved response (samples/), never the live source
import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";
import { fetchHackClub, parseHackClub } from "./hackclub";
import { KAGGLE_URL, fetchKaggle, parseKaggle } from "./kaggle";
import { KSTARTUP_URL, fetchKStartup, parseKStartup } from "./kstartup";
import { fetchLuma, parseIcs, parseLuma } from "./luma";
import { dedupeKey, normalizeTitle, urlDomain } from "./dedupe";
import { isPast } from "./run";
import { guessLanguages, toDay, validUrl, type Fetch } from "./types";

const sample = (name: string) => readFileSync(new URL(`./samples/${name}`, import.meta.url), "utf8");
const json = (name: string) => JSON.parse(sample(name));
const respond = (body: string, status = 200) => vi.fn<Fetch>(async () => new Response(body, { status }));

describe("Hack Club", () => {
  const events = parseHackClub(json("hackclub.json"));

  it("reads every event with a link", () => {
    expect(events.map((e) => e.external_id)).toEqual(["0n1I4x", "01xIOo", "r2RIWj", "3aDIGP", "0n1IKx"]);
  });

  it("takes the place from the source and marks the language as a guess", () => {
    const rex = events.find((e) => e.external_id === "0n1I4x");
    expect(rex).toMatchObject({
      source: "hackclub", title: "Hack The Rex", type: "hackathon", url: "https://www.hacktherex.com/",
      starts_at: "2026-12-03", ends_at: "2026-12-03", deadline: null,
      online: false, country: "CA", city: "Etobicoke", languages: ["English"], inferred: ["languages"],
      eligibility: "students",
    });
    // Vietnam, Latin title: the country's language
    expect(events.find((e) => e.external_id === "01xIOo")).toMatchObject({ country: "VN", city: "Hà Đông", languages: ["Vietnamese"] });
  });

  it("an online-only event has no country or city", () => {
    expect(events.find((e) => e.external_id === "r2RIWj")).toMatchObject({ online: true, country: null, city: "", languages: ["English"] });
  });

  it("asks the public endpoint, and fails on an error answer", async () => {
    const fetcher = respond(sample("hackclub.json"));
    await fetchHackClub(fetcher);
    expect(fetcher.mock.calls[0][0]).toBe("https://hackathons.hackclub.com/api/events/upcoming");
    await expect(fetchHackClub(respond("", 503))).rejects.toThrow("Hack Club answered 503");
  });

  it("refuses an answer that isn't a list", () => {
    expect(() => parseHackClub({ error: "nope" })).toThrow();
  });
});

describe("Kaggle", () => {
  const events = parseKaggle(json("kaggle.json"));

  it("skips Getting Started competitions", () => {
    expect(events.map((e) => e.title)).toEqual(["Sample Vision Challenge", "Sample Playground Series", "Sample Closed Entries"]);
  });

  it("joins by the new-entrant deadline and ends at the final one; online, in English", () => {
    expect(events[0]).toMatchObject({
      source: "kaggle", external_id: "90001", type: "competition", organizer: "Sample Lab",
      url: "https://www.kaggle.com/competitions/sample-vision-challenge",
      starts_at: null, deadline: "2027-02-08", ends_at: "2027-02-15",
      online: true, country: null, languages: ["English"], inferred: ["languages"], eligibility: "anyone",
    });
  });

  it("builds the page from a bare ref, and Kaggle is the organizer when none is named", () => {
    expect(events[1]).toMatchObject({ url: "https://www.kaggle.com/competitions/sample-playground-series", organizer: "Kaggle", deadline: null });
  });

  it("a competition closed to new entrants is past, even before it ends", () => {
    expect(isPast(events[2], "2026-11-30")).toBe(true);
    expect(isPast(events[0], "2026-11-30")).toBe(false);
  });

  it("sends the token as a bearer token to the official API and follows page tokens", async () => {
    const pages = [{ competitions: [json("kaggle.json").competitions[0]], nextPageToken: "two" }, { competitions: [], nextPageToken: "" }];
    const fetcher = vi.fn<Fetch>(async () => new Response(JSON.stringify(pages.shift())));
    const found = await fetchKaggle("KGAT_secret", fetcher);
    expect(found).toHaveLength(1);
    expect(fetcher).toHaveBeenCalledTimes(2);
    const [url, init] = fetcher.mock.calls[1];
    expect(url).toBe(KAGGLE_URL);
    expect(init?.method).toBe("POST");
    expect((init?.headers as Record<string, string>).authorization).toBe("Bearer KGAT_secret");
    expect(JSON.parse(String(init?.body))).toMatchObject({ group: "COMPETITION_LIST_TAB_GENERAL", pageToken: "two" });
  });

  it("an error never repeats the token", async () => {
    await expect(fetchKaggle("KGAT_secret", respond("", 401))).rejects.toThrow(/^Kaggle answered 401$/);
  });
});

describe("K-Startup", () => {
  const events = parseKStartup(json("kstartup.json"));

  it("keeps announcements open to university students", () => {
    expect(events.map((e) => e.external_id)).toEqual(["170001", "170002", "170004"]);
  });

  it("is restricted to Korea, in Korean, with the region as the city", () => {
    expect(events[0]).toMatchObject({
      source: "kstartup", title: "2027년 샘플 대학생 창업 아이디어 경진대회", type: "competition", organizer: "샘플창업진흥원",
      deadline: "2026-12-15", starts_at: null, country: "KR", city: "", languages: ["Korean"], inferred: ["languages"],
      eligibility: "country", eligibility_note: "신청 대상: 대학생,일반인",
    });
    expect(events[1]).toMatchObject({ type: "grant", city: "Seoul", deadline: "2027-01-10" });
    expect(events[2]).toMatchObject({ type: "hackathon", city: "Busan" });
  });

  it("asks for JSON, only recruiting, and decodes a URL-encoded key once", async () => {
    const fetcher = respond(sample("kstartup.json"));
    await fetchKStartup("abc%2Bdef%3D%3D", fetcher);
    const url = new URL(String(fetcher.mock.calls[0][0]));
    expect(url.origin + url.pathname).toBe(KSTARTUP_URL);
    expect(url.searchParams.get("serviceKey")).toBe("abc+def==");
    expect(url.searchParams.get("returnType")).toBe("json");
    expect(url.searchParams.get("cond[rcrt_prgs_yn::EQ]")).toBe("Y");
  });

  it("an error never repeats the address, which carries the key", async () => {
    await expect(fetchKStartup("secret-key", respond("", 500))).rejects.toThrow(/^K-Startup answered 500$/);
  });
});

describe("Luma", () => {
  const text = sample("luma.ics");
  const events = parseLuma(text);

  it("unfolds long lines and reads the calendar's name", () => {
    const { calendar, events: raw } = parseIcs(text);
    expect(calendar).toBe("Sample Builders Seoul");
    expect(raw[0].LOCATION).toBe("Sample Campus, South Korea, Seoul, Gangnam District, 대치2동 Yeongdong-daero, 417 B2");
  });

  it("skips cancelled events", () => {
    expect(events.map((e) => e.external_id)).not.toContain("evt-SampleCancelled@events.lu.ma");
    expect(events).toHaveLength(4);
  });

  it("finds the event page and the place, marking guesses", () => {
    expect(events[0]).toMatchObject({
      source: "luma", title: "Sample Builders Hackathon, Winter Edition", type: "hackathon", url: "https://luma.com/samplehack",
      organizer: "Sample Builders Seoul", description: "", starts_at: "2026-12-12", ends_at: "2026-12-13",
      online: false, country: "KR", city: "Seoul", languages: ["Korean"],
    });
    expect(events[0].inferred).toEqual(["languages", "online", "country", "city"]);
  });

  it("an address kept for guests leaves the place unknown; a Hangul title is Korean", () => {
    expect(events[1]).toMatchObject({ title: "서울 AI 빌더 밋업", online: false, country: null, city: "", languages: ["Korean"], inferred: ["languages", "online"] });
  });

  it("a meeting link is online; local times keep their day", () => {
    expect(events[2]).toMatchObject({ online: true, country: null, starts_at: "2027-01-10", languages: ["English"] });
  });

  it("reads every feed, and fails on a feed that errors", async () => {
    const fetcher = respond(text);
    expect(await fetchLuma(["https://api.lu.ma/ics/get?entity=calendar&id=cal-1", "https://api.lu.ma/ics/get?entity=calendar&id=cal-2"], fetcher)).toHaveLength(8);
    await expect(fetchLuma(["https://api.lu.ma/ics/get?entity=calendar&id=cal-1"], respond("", 404))).rejects.toThrow("A Luma feed answered 404");
  });
});

describe("dedupe", () => {
  it("ignores case, spacing, punctuation and www", () => {
    expect(normalizeTitle("Hack The Rex — 2026!")).toBe("hacktherex2026");
    expect(urlDomain("https://www.HackTheRex.com/apply?x=1")).toBe("hacktherex.com");
    expect(dedupeKey({ title: "Hack the Rex", starts_at: "2026-12-03", url: "https://hacktherex.com" })).toBe(
      dedupeKey({ title: "HACK THE REX", starts_at: "2026-12-03", url: "https://www.hacktherex.com/register" }),
    );
  });

  it("a different start or site is a different event", () => {
    const base = { title: "Hack the Rex", starts_at: "2026-12-03", url: "https://hacktherex.com" };
    expect(dedupeKey(base)).not.toBe(dedupeKey({ ...base, starts_at: "2027-12-03" }));
    expect(dedupeKey(base)).not.toBe(dedupeKey({ ...base, url: "https://luma.com/hacktherex" }));
  });

  it("keeps Hangul titles", () => {
    expect(normalizeTitle("샘플 해커톤 2026")).toBe("샘플해커톤2026");
  });
});

describe("shared helpers", () => {
  it("guesses a language from the title's script, then the country", () => {
    expect(guessLanguages("서울 해커톤", null)).toEqual(["Korean"]);
    expect(guessLanguages("東京ハッカソン", "JP")).toEqual(["Japanese"]);
    expect(guessLanguages("Хакатон", "KZ")).toEqual(["Russian"]);
    expect(guessLanguages("HackMIT", "US")).toEqual(["English"]);
    expect(guessLanguages("Online jam", null)).toEqual(["English"]);
    expect(guessLanguages("Hackathon Lisboa", "PT")).toEqual([]);
  });

  it("reads days in either format, and only http(s) links with a dotted host", () => {
    expect(toDay("2026-12-03T12:00:00.000Z")).toBe("2026-12-03");
    expect(toDay("20261215")).toBe("2026-12-15");
    expect(toDay("")).toBeNull();
    expect(validUrl("javascript:alert(1)")).toBeNull();
    expect(validUrl("https://localhost")).toBeNull();
    expect(validUrl(" https://example.com/x ")).toBe("https://example.com/x");
  });
});
