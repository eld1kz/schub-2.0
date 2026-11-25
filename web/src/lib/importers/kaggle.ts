// Kaggle competitions through Kaggle's official API (the endpoint and fields the kagglesdk package uses), with a
// KAGGLE_API_TOKEN from kaggle.com → Settings → API. Kaggle's terms bar scraping its pages, so this only ever uses
// the API, and keeps just what a listing needs: title, host, short subtitle, dates and link.
// Getting Started competitions (tutorials that run for years) are left out.
import { LIMITS, USER_AGENT, clip, toDay, validUrl, type Fetch, type ImportedEvent } from "./types";

export const KAGGLE_URL = "https://api.kaggle.com/v1/competitions.CompetitionApiService/ListCompetitions";
// More than enough for every active competition, without paging forever if something goes wrong
const MAX_PAGES = 10;

type KaggleCompetition = {
  id?: number;
  ref?: string;
  title?: string;
  url?: string;
  description?: string;
  organizationName?: string;
  category?: string;
  deadline?: string;
  newEntrantDeadline?: string;
};

// The competition's page: the url, else from its ref (a slug, or already the page's address)
function pageOf(c: KaggleCompetition) {
  if (c.url) return validUrl(c.url);
  if (!c.ref) return null;
  return validUrl(c.ref.startsWith("http") ? c.ref : `https://www.kaggle.com/competitions/${c.ref}`);
}

export function parseKaggle(body: unknown): ImportedEvent[] {
  const competitions = (body as { competitions?: unknown })?.competitions;
  if (!Array.isArray(competitions)) throw new Error("Kaggle: expected competitions in the response");
  return (competitions as KaggleCompetition[]).flatMap((c) => {
    const url = pageOf(c);
    const title = clip(c.title, LIMITS.title);
    const ends = toDay(c.deadline);
    if (!url || title.length < 3 || !ends || /getting\s*started/i.test(c.category ?? "")) return [];
    // You can join until the new-entrant deadline; the competition ends at the final deadline
    const joinBy = toDay(c.newEntrantDeadline);
    return [{
      source: "kaggle",
      external_id: String(c.id ?? c.ref),
      title,
      type: "competition",
      organizer: clip(c.organizationName || "Kaggle", LIMITS.organizer),
      url,
      description: clip(c.description, LIMITS.description),
      starts_at: null,
      deadline: joinBy && joinBy <= ends ? joinBy : null,
      ends_at: ends,
      online: true,
      country: null,
      city: "",
      // Kaggle runs in English
      languages: ["English"],
      eligibility: "anyone",
      eligibility_note: "",
      inferred: ["languages"],
    } satisfies ImportedEvent];
  });
}

export async function fetchKaggle(token: string, fetcher: Fetch = fetch) {
  const events: ImportedEvent[] = [];
  let pageToken = "";
  for (let page = 0; page < MAX_PAGES; page++) {
    const response = await fetcher(KAGGLE_URL, {
      method: "POST",
      headers: { authorization: `Bearer ${token}`, "content-type": "application/json", "user-agent": USER_AGENT },
      body: JSON.stringify({
        group: "COMPETITION_LIST_TAB_GENERAL",
        sortBy: "COMPETITION_SORT_BY_EARLIEST_DEADLINE",
        pageSize: 50,
        ...(pageToken && { pageToken }),
      }),
      signal: AbortSignal.timeout(20_000),
    });
    if (!response.ok) throw new Error(`Kaggle answered ${response.status}`);
    const body = (await response.json()) as { nextPageToken?: string };
    events.push(...parseKaggle(body));
    pageToken = body.nextPageToken ?? "";
    if (!pageToken) break;
  }
  return events;
}
