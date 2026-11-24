// The filters and sorting on /opportunities. They live in the URL (?type=hackathon&country=KR&lang=Korean&canjoin=1
// &sort=newest), so a filtered list can be shared and undone with Back.
//
// Signed-in members with no filters picked see events "for you": in their country (from their profile city) or
// online, in one of their languages. Events that don't say where or in which language still show, since they might
// suit them. ?all=1 turns it off. Picking any filter replaces it.
import { countryName } from "./countries";
import { LANGUAGES } from "./languages";
import { opportunityTypes, type OpportunityType } from "./opportunities";

export const ONLINE = "online";
export const SORTS = { deadline: "Deadline soonest", newest: "Newest", looking: "Most people looking" } as const;
export type Sort = keyof typeof SORTS;

export type Filters = { type: OpportunityType | null; country: string; lang: string; canJoin: boolean; sort: Sort; all: boolean };

// Where you are and what you speak; null country when your profile's city isn't one we know
export type Me = { country: string | null; languages: string[] };

export type Listing = {
  type: OpportunityType;
  country: string | null;
  online: boolean;
  languages: string[];
  eligibility: string;
  featured: boolean;
  created_at: string;
  looking: number;
  // The next date that matters (nextDate in opportunities.ts)
  date: string | null;
};

type Params = Record<string, string | string[] | undefined>;
const one = (value: string | string[] | undefined) => (typeof value === "string" ? value : "");

export function readFilters(params: Params): Filters {
  const type = one(params.type);
  const country = one(params.country);
  const lang = one(params.lang);
  const sort = one(params.sort);
  return {
    type: type in opportunityTypes ? (type as OpportunityType) : null,
    country: country === ONLINE || /^[A-Z]{2}$/.test(country) ? country : "",
    lang: LANGUAGES.includes(lang) ? lang : "",
    canJoin: one(params.canjoin) === "1",
    sort: sort in SORTS ? (sort as Sort) : "deadline",
    all: one(params.all) === "1",
  };
}

export function filtersHref(f: Filters) {
  const params = new URLSearchParams();
  if (f.type) params.set("type", f.type);
  if (f.country) params.set("country", f.country);
  if (f.lang) params.set("lang", f.lang);
  if (f.canJoin) params.set("canjoin", "1");
  if (f.sort !== "deadline") params.set("sort", f.sort);
  if (f.all) params.set("all", "1");
  const query = params.toString();
  return query ? `/opportunities?${query}` : "/opportunities";
}

// "For you" applies to a member who picked no place or language, hasn't asked for everything, and whose profile says
// where they are or what they speak
export const forYou = (f: Filters, me: Me | null): me is Me =>
  Boolean(me && !f.all && !f.country && !f.lang && (me.country || me.languages.length > 0));

// "South Korea or online, in Korean or English"
export function forYouLabel(me: Me) {
  const where = me.country ? `${countryName(me.country)} or online` : "";
  const speaking = me.languages.length > 0 ? `in ${me.languages.join(" or ")}` : "";
  return [where, speaking].filter(Boolean).join(", ");
}

const suits = (o: Listing, me: Me) =>
  (!me.country || o.online || o.country === null || o.country === me.country) &&
  (me.languages.length === 0 || o.languages.length === 0 || o.languages.some((l) => me.languages.includes(l)));

// Restricted to a country you're not in (or, when we don't know where you are, to any country)
const canJoin = (o: Listing, me: Me | null) => o.eligibility !== "country" || (me?.country != null && o.country === me.country);

// Every filter except the one named, so each one's counts show what picking it would leave
export function matches(o: Listing, f: Filters, me: Me | null, except?: "type" | "country") {
  if (except !== "type" && f.type && o.type !== f.type) return false;
  if (except !== "country" && f.country && (f.country === ONLINE ? !o.online : o.country !== f.country)) return false;
  if (f.lang && !o.languages.includes(f.lang)) return false;
  if (f.canJoin && !canJoin(o, me)) return false;
  if (except !== "country" && forYou(f, me) && !suits(o, me)) return false;
  return true;
}

const soonest = (a: Listing, b: Listing) => (a.date ?? "9999").localeCompare(b.date ?? "9999");

export function sortListings<T extends Listing>(list: T[], sort: Sort) {
  const sorted = [...list];
  if (sort === "newest") return sorted.sort((a, b) => b.created_at.localeCompare(a.created_at));
  if (sort === "looking") return sorted.sort((a, b) => b.looking - a.looking || soonest(a, b));
  // Featured first, then the soonest next date; ones without a date last
  return sorted.sort((a, b) => Number(b.featured) - Number(a.featured) || soonest(a, b));
}

// The country choices with how many events each has: online first, then Korea, then every other country with events,
// most events first
export function countryOptions(list: Listing[]) {
  const counts = new Map<string, number>();
  for (const o of list) if (o.country) counts.set(o.country, (counts.get(o.country) ?? 0) + 1);
  const others = [...counts].filter(([code]) => code !== "KR").sort((a, b) => b[1] - a[1] || countryName(a[0]).localeCompare(countryName(b[0])));
  return [
    { value: ONLINE, label: "Online / worldwide", count: list.filter((o) => o.online).length },
    { value: "KR", label: countryName("KR"), count: counts.get("KR") ?? 0 },
    ...others.map(([code, count]) => ({ value: code, label: countryName(code), count })),
  ];
}
