import { countryName } from "./countries";

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

// Within this many days, the time left shows in the accent color
export const SOON_DAYS = 7;

type Dates = { deadline: string | null; starts_at: string | null; ends_at: string | null };

// The next date that matters: the deadline while it's ahead, then the start, then the end of a running event
export function nextDate(o: Dates, day: string) {
  if (o.deadline && o.deadline >= day) return { label: `Apply by ${formatDay(o.deadline)}`, date: o.deadline };
  if (o.starts_at && o.starts_at >= day) return { label: `Starts ${formatDay(o.starts_at)}`, date: o.starts_at };
  if (o.ends_at && o.ends_at >= day) return { label: `Ends ${formatDay(o.ends_at)}`, date: o.ends_at };
  return { label: "No date set", date: null };
}

// An event's last day: its end, else its start, else its deadline; null when it has no dates
export const lastDay = (o: Dates) => o.ends_at ?? o.starts_at ?? o.deadline;

// Over once its last day is before `day`; an event with no dates never is
export function hasEnded(o: Dates, day: string) {
  const last = lastDay(o);
  return last !== null && last < day;
}

// Whole days from today to a plain YYYY-MM-DD day
export const daysUntil = (date: string, day: string) => Math.round((Date.parse(date) - Date.parse(day)) / 86_400_000);
export const daysLabel = (n: number) => (n === 0 ? "Today" : n === 1 ? "1 day left" : n <= SOON_DAYS ? `${n} days left` : `${n} days`);

// "Dec 4 – Dec 10, 2026", or just the start or the end when that's all there is
export function dateRange(start: string | null, end: string | null) {
  if (start && end) {
    const from = new Date(start).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
    return start === end ? formatDay(start) : `${from} – ${formatDay(end)}`;
  }
  if (start) return `Starts ${formatDay(start)}`;
  if (end) return `Ends ${formatDay(end)}`;
  return "";
}

// Where it happens: "Seoul, South Korea", "Online", or both. Opportunities added before the city and country
// columns (supabase/opportunity-engine.sql) only have the typed-in location.
export function placeLabel(o: { location: string; online: boolean; city?: string; country?: string | null }) {
  const place = [o.city || o.location, countryName(o.country ?? null)].filter(Boolean).join(", ");
  return [place, o.online && "Online"].filter(Boolean).join(" · ");
}

// Who can join (opportunities.eligibility); "country" means only people in the event's country
export const ELIGIBILITY = {
  anyone: "Anyone",
  students: "Students",
  country: "Only people in its country",
} as const;

export type Eligibility = keyof typeof ELIGIBILITY;
export const isEligibility = (value: unknown): value is Eligibility => typeof value === "string" && value in ELIGIBILITY;
