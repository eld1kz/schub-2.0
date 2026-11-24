// Hack Club's list of upcoming high school hackathons: a public JSON API with no key, no robots.txt and no stated
// limits (checked 2026-11-24). The site lists high school events, so they're marked for students.
import { isCountryCode } from "../countries";
import { LIMITS, USER_AGENT, clip, guessLanguages, toDay, validUrl, type Fetch, type ImportedEvent } from "./types";

export const HACKCLUB_URL = "https://hackathons.hackclub.com/api/events/upcoming";

type HackClubEvent = {
  id: string;
  name: string;
  website: string;
  start: string;
  end: string;
  city: string | null;
  countryCode: string | null;
  virtual: boolean;
  hybrid: boolean;
};

export function parseHackClub(events: unknown): ImportedEvent[] {
  if (!Array.isArray(events)) throw new Error("Hack Club: expected a list of events");
  return (events as HackClubEvent[]).flatMap((e) => {
    const url = validUrl(e.website);
    const title = clip(e.name, LIMITS.title);
    if (!e.id || !url || title.length < 3) return [];
    // Online only: no place. Hybrid: online and somewhere.
    const onlineOnly = e.virtual && !e.hybrid;
    const code = e.countryCode?.toUpperCase() ?? null;
    const country = !onlineOnly && isCountryCode(code) ? code : null;
    return [{
      source: "hackclub",
      external_id: String(e.id),
      title,
      type: "hackathon",
      organizer: "",
      url,
      description: "",
      starts_at: toDay(e.start),
      deadline: null,
      ends_at: toDay(e.end),
      online: Boolean(e.virtual || e.hybrid),
      country,
      city: country ? clip(e.city, LIMITS.city) : "",
      languages: guessLanguages(title, country),
      eligibility: "students",
      eligibility_note: "High school students (listed by Hack Club)",
      inferred: ["languages"],
    } satisfies ImportedEvent];
  });
}

export async function fetchHackClub(fetcher: Fetch = fetch) {
  const response = await fetcher(HACKCLUB_URL, { headers: { "user-agent": USER_AGENT }, signal: AbortSignal.timeout(20_000) });
  if (!response.ok) throw new Error(`Hack Club answered ${response.status}`);
  return parseHackClub(await response.json());
}
