export const opportunityTypes = {
  hackathon: "Hackathon",
  competition: "Competition",
  grant: "Grant",
  internship: "Internship",
  other: "Other",
} as const;

export type OpportunityType = keyof typeof opportunityTypes;

// Dates are stored as plain days (YYYY-MM-DD); format in UTC so they don't shift a day.
export function formatDay(day: string | null) {
  return day ? new Date(day).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" }) : "";
}

export function today() {
  return new Date().toISOString().slice(0, 10);
}

// Rejects links that don't resolve or are gone (404/410). Sites that block bots (403, 429)
// still count as working, since a person can open them.
export async function linkWorks(url: string) {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return false;
  }
  // Only public websites: no localhost, bare hostnames or raw IP addresses.
  if (!/^https?:$/.test(parsed.protocol) || !parsed.hostname.includes(".") || /^[\d.]+$|:/.test(parsed.hostname)) {
    return false;
  }
  try {
    const res = await fetch(parsed, { redirect: "follow", signal: AbortSignal.timeout(8000), headers: { "user-agent": "Mozilla/5.0 (Schub link check)" } });
    return res.status !== 404 && res.status !== 410;
  } catch {
    return false;
  }
}
