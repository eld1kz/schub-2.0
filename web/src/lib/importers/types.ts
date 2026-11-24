// The one shape every importer returns, and what they share: clipping to the database's limits and guessing an
// event's languages. Imports are relative (not "@/") so scripts/import-opportunities.ts runs outside Next.
import type { OpportunityType } from "../opportunities";

export type Source = "hackclub" | "kaggle" | "kstartup" | "luma";
export type Eligibility = "anyone" | "students" | "country";
// Fields an importer guessed rather than read from its source (opportunities.inferred)
export type Inferred = "country" | "city" | "online" | "languages";

export type ImportedEvent = {
  source: Source;
  external_id: string;
  title: string;
  type: OpportunityType;
  organizer: string;
  url: string;
  description: string;
  // Plain days, YYYY-MM-DD
  starts_at: string | null;
  deadline: string | null;
  ends_at: string | null;
  online: boolean;
  // ISO code; null when it's online only or not known
  country: string | null;
  city: string;
  languages: string[];
  eligibility: Eligibility;
  eligibility_note: string;
  inferred: Inferred[];
};

export type Fetch = typeof fetch;

export const USER_AGENT = "Mozilla/5.0 (Schub opportunity importer)";

// The database's limits (opportunities.sql, length-limits.sql, opportunity-engine.sql)
export const clip = (text: unknown, max: number) => String(text ?? "").replace(/\s+/g, " ").trim().slice(0, max);
export const LIMITS = { title: 200, organizer: 120, description: 3000, city: 80, note: 300 };

// A link the database accepts: http(s) and a dotted host
export function validUrl(url: unknown) {
  const parsed = typeof url === "string" ? URL.parse(url.trim()) : null;
  return parsed && /^https?:$/.test(parsed.protocol) && parsed.hostname.includes(".") ? parsed.href : null;
}

// The day part of an ISO date or timestamp, or of yyyyMMdd
export function toDay(value: unknown) {
  const text = String(value ?? "").trim();
  const iso = text.match(/^(\d{4})-(\d{2})-(\d{2})/);
  const compact = text.match(/^(\d{4})(\d{2})(\d{2})/);
  const m = iso ?? compact;
  return m ? `${m[1]}-${m[2]}-${m[3]}` : null;
}

// Where English is what an event most likely runs in
const ENGLISH = ["US", "GB", "CA", "AU", "NZ", "IE", "IN", "SG", "PH", "PK", "NG", "KE", "ZA", "GH"];
// Otherwise a country's main language, when it's on the fixed list (src/lib/languages.ts)
const MAIN: Record<string, string> = {
  KR: "Korean", JP: "Japanese", CN: "Chinese", TW: "Chinese", HK: "Chinese", RU: "Russian", KZ: "Russian", UZ: "Uzbek",
  VN: "Vietnamese", MN: "Mongolian", FR: "French", DE: "German", AT: "German", ES: "Spanish", MX: "Spanish", AR: "Spanish",
  CO: "Spanish", CL: "Spanish", PE: "Spanish",
};

// A guess at the language an event runs in, from its title's script and its country: Hangul → Korean, kana → Japanese,
// Han → Chinese, Cyrillic → Russian; Latin → English where English is likely (or online, or nowhere known), else the
// country's main language. [] when there's no good guess. Importers mark the result as inferred.
export function guessLanguages(title: string, country: string | null): string[] {
  if (/[가-힯ᄀ-ᇿ㄰-㆏]/.test(title)) return ["Korean"];
  if (/[぀-ヿ]/.test(title)) return ["Japanese"];
  if (/[一-鿿]/.test(title)) return ["Chinese"];
  if (/[Ѐ-ӿ]/.test(title)) return ["Russian"];
  if (!/[A-Za-z]/.test(title)) return [];
  if (!country || ENGLISH.includes(country)) return ["English"];
  return MAIN[country] ? [MAIN[country]] : [];
}
