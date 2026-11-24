// "Fill from link" on /opportunities/new: what an event page says about itself, from its schema.org Event (JSON-LD)
// and, where that's missing, its Open Graph and plain meta tags. The person still checks and submits the form.
import { countryOf, isCountryCode } from "./countries";
import { knownLanguages } from "./languages";
import type { OpportunityType } from "./opportunities";

export type Prefill = {
  title: string;
  type: OpportunityType | "";
  organizer: string;
  description: string;
  city: string;
  country: string;
  online: boolean;
  deadline: string;
  starts_at: string;
  ends_at: string;
  languages: string[];
};

type Json = Record<string, unknown>;

const ENTITIES: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " " };
const decode = (text: string) =>
  text.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (whole, code: string) => {
    if (code[0] === "#") {
      const n = code[1].toLowerCase() === "x" ? parseInt(code.slice(2), 16) : parseInt(code.slice(1), 10);
      return Number.isFinite(n) && n > 0 && n <= 0x10ffff ? String.fromCodePoint(n) : whole;
    }
    return ENTITIES[code.toLowerCase()] ?? whole;
  });

const text = (value: unknown, max: number) => (typeof value === "string" ? decode(value).replace(/\s+/g, " ").trim().slice(0, max) : "");
const day = (value: unknown) => (typeof value === "string" && /^\d{4}-\d{2}-\d{2}/.test(value) ? value.slice(0, 10) : "");
const list = (value: unknown): unknown[] => (Array.isArray(value) ? value : value === undefined || value === null ? [] : [value]);
const nameOf = (value: unknown) => (typeof value === "string" ? value : typeof value === "object" && value ? (value as Json).name : undefined);

// Every JSON-LD object on the page, including ones nested in arrays and @graph
function jsonLd(html: string) {
  const found: Json[] = [];
  const visit = (node: unknown) => {
    if (Array.isArray(node)) node.forEach(visit);
    else if (node && typeof node === "object") {
      found.push(node as Json);
      visit((node as Json)["@graph"]);
    }
  };
  for (const [, body] of html.matchAll(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)) {
    try {
      visit(JSON.parse(body.trim()));
    } catch {
      // A broken block: skip it
    }
  }
  return found;
}

const isEvent = (o: Json) => list(o["@type"]).some((t) => typeof t === "string" && (/Event$/.test(t) || t === "Hackathon"));

// <meta property|name="..." content="...">, attributes in any order
function metaTags(html: string) {
  const tags = new Map<string, string>();
  for (const [tag] of html.matchAll(/<meta\s[^>]*>/gi)) {
    const attr = (name: string) => tag.match(new RegExp(`\\s${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)')`, "i"))?.slice(1).find((v) => v !== undefined);
    const key = (attr("property") ?? attr("name"))?.toLowerCase();
    const content = attr("content");
    if (key && content !== undefined && !tags.has(key)) tags.set(key, content);
  }
  return tags;
}

// ISO 639-1 codes for the fixed language list
const CODES: Record<string, string> = { ko: "Korean", en: "English", ru: "Russian", kk: "Kazakh", uz: "Uzbek", zh: "Chinese", ja: "Japanese", vi: "Vietnamese", mn: "Mongolian", fr: "French", es: "Spanish", de: "German" };
const languagesFrom = (values: unknown[]) =>
  knownLanguages(values.map((v) => nameOf(v)).filter((v): v is string => typeof v === "string").map((v) => CODES[v.toLowerCase().split(/[-_]/)[0]] ?? v));

function guessType(title: string): OpportunityType | "" {
  if (/hack|해커톤/i.test(title)) return "hackathon";
  if (/competition|challenge|contest|olympiad|공모전|경진대회/i.test(title)) return "competition";
  if (/grant|fellowship|scholarship|funding/i.test(title)) return "grant";
  if (/intern/i.test(title)) return "internship";
  return "";
}

// The place: a Place's address (text or PostalAddress), or a VirtualLocation for online
function placeOf(event: Json) {
  let city = "";
  let country = "";
  let online = /Online|Mixed/.test(String(event.eventAttendanceMode ?? ""));
  for (const location of list(event.location)) {
    if (typeof location === "string") {
      if (/^https?:\/\//.test(location)) online = true;
      else country ||= countryOf(location) ?? "";
      continue;
    }
    const place = location as Json;
    if (list(place["@type"]).includes("VirtualLocation")) {
      online = true;
      continue;
    }
    const address = place.address;
    if (typeof address === "string") country ||= countryOf(address) ?? "";
    else if (address && typeof address === "object") {
      const a = address as Json;
      city ||= text(a.addressLocality, 80);
      const named = text(nameOf(a.addressCountry), 80);
      country ||= isCountryCode(named.toUpperCase()) ? named.toUpperCase() : (countryOf(named) ?? "");
    }
    country ||= countryOf(text(place.name, 200)) ?? "";
  }
  if (!country && city) country = countryOf(city) ?? "";
  return { city, country, online };
}

export function readEventPage(html: string): Prefill {
  const event = jsonLd(html).find(isEvent) ?? {};
  const meta = metaTags(html);
  const titleTag = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1];
  const title = text(event.name, 200) || text(meta.get("og:title"), 200) || text(titleTag, 200);
  // An offer's last day to get a ticket works as the deadline when it's on or before the start
  const startsAt = day(event.startDate);
  const validThrough = list(event.offers).map((o) => day((o as Json)?.validThrough)).find(Boolean) ?? "";
  const locale = meta.get("og:locale");
  return {
    title,
    type: guessType(title),
    organizer: text(nameOf(list(event.organizer)[0]), 120) || text(meta.get("og:site_name"), 120),
    description: text(event.description, 3000) || text(meta.get("og:description") ?? meta.get("description"), 3000),
    ...placeOf(event),
    starts_at: startsAt,
    ends_at: day(event.endDate),
    deadline: validThrough && (!startsAt || validThrough <= startsAt) ? validThrough : "",
    languages: languagesFrom([...list(event.inLanguage), ...(list(event.inLanguage).length === 0 && locale ? [locale] : [])]),
  };
}

// True when the page gave nothing beyond a title
export const foundDetails = (p: Prefill) => Boolean(p.starts_at || p.ends_at || p.deadline || p.city || p.country || p.organizer || p.description);
