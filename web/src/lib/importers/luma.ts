// Public Luma calendars through their iCal feeds, the subscription Luma offers on every calendar ("Add iCal
// Subscription"). Luma has no open API (its API needs Luma Plus and covers only your own calendars), and its terms
// allow reuse only through its public interfaces, so this keeps the facts a listing needs (title, dates, place, link)
// and no descriptions, images or host names. Every Luma event waits for an admin's review.
import { cityIn, countryOf } from "../countries";
import { LIMITS, USER_AGENT, clip, guessLanguages, toDay, validUrl, type Fetch, type ImportedEvent, type Inferred } from "./types";

type Properties = Record<string, string>;

// Text values escape commas, semicolons, backslashes and newlines
const unescape = (value: string) => value.replace(/\\([nN,;\\])/g, (_, c: string) => (c === "n" || c === "N" ? "\n" : c));

// The calendar's name and each VEVENT's properties, by name (parameters like ;TZID=... dropped). Long lines fold
// onto the next with a leading space or tab.
export function parseIcs(text: string) {
  const lines = text.replace(/\r\n/g, "\n").replace(/\n[ \t]/g, "").split("\n");
  const events: Properties[] = [];
  let calendar = "";
  let current: Properties | null = null;
  for (const line of lines) {
    if (line === "BEGIN:VEVENT") current = {};
    else if (line === "END:VEVENT" && current) {
      events.push(current);
      current = null;
    } else {
      const colon = line.indexOf(":");
      if (colon === -1) continue;
      const name = line.slice(0, colon).split(";")[0].toUpperCase();
      const value = unescape(line.slice(colon + 1));
      if (current) current[name] = value;
      else if (name === "X-WR-CALNAME") calendar = value;
    }
  }
  return { calendar, events };
}

const LUMA_PAGE = /https:\/\/(?:lu\.ma|luma\.com)\/(?!event\/)[\w-]+/;

// Luma puts the event page in the description ("Get up-to-date information at: https://luma.com/abc"), the place in
// LOCATION (an address, a meeting link, or the event page when the address is only for guests) and an "Address:"
// block in the description.
function placeOf(location: string, description: string) {
  const link = /^https?:\/\//.test(location);
  const hidden = /^https:\/\/(lu\.ma|luma\.com)\//.test(location);
  const address = link ? (description.match(/Address:\n([\s\S]*?)(\n\n|$)/)?.[1] ?? "") : location;
  return { address, online: link && !hidden };
}

export function parseLuma(text: string): ImportedEvent[] {
  const { calendar, events } = parseIcs(text);
  return events.flatMap((e) => {
    const description = e.DESCRIPTION ?? "";
    const url = validUrl(e.URL) ?? validUrl(description.match(LUMA_PAGE)?.[0]);
    const title = clip(e.SUMMARY, LIMITS.title);
    if (!e.UID || !url || title.length < 3 || e.STATUS === "CANCELLED") return [];
    const { address, online } = placeOf(e.LOCATION ?? "", description);
    const country = countryOf(address);
    const city = clip(cityIn(address), LIMITS.city);
    const languages = guessLanguages(title, country);
    const inferred: Inferred[] = ["languages", "online"];
    if (country) inferred.push("country");
    if (city) inferred.push("city");
    return [{
      source: "luma",
      external_id: e.UID,
      title,
      type: /hack/i.test(title) || /해커톤/.test(title) ? "hackathon" : "other",
      organizer: clip(calendar, LIMITS.organizer),
      url,
      description: "",
      starts_at: toDay(e.DTSTART),
      deadline: null,
      ends_at: toDay(e.DTEND),
      online,
      country,
      city,
      languages,
      eligibility: "anyone",
      eligibility_note: "",
      inferred,
    } satisfies ImportedEvent];
  });
}

export async function fetchLuma(feeds: string[], fetcher: Fetch = fetch) {
  const events: ImportedEvent[] = [];
  for (const feed of feeds) {
    const response = await fetcher(feed, { headers: { "user-agent": USER_AGENT }, signal: AbortSignal.timeout(20_000) });
    if (!response.ok) throw new Error(`A Luma feed answered ${response.status}`);
    events.push(...parseLuma(await response.text()));
  }
  return events;
}
