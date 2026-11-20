// Languages people work in, how much time they have and how they like to work. Fixed lists: the database only
// accepts these values (supabase/languages.sql), on profiles and, for languages and work mode, on teams.
export const LANGUAGES = ["Korean", "English", "Russian", "Kazakh", "Uzbek", "Chinese", "Japanese", "Vietnamese", "Mongolian", "French", "Spanish", "German"];
export const HOURS = ["Under 5", "5-10", "10-20", "20+"];
export const WORK_MODES = ["In person", "Remote", "Either"];

const byLowercase = new Map(LANGUAGES.map((l) => [l.toLowerCase(), l]));

// Keeps only languages from the list, in their listed spelling, each once
export function knownLanguages(values: unknown[]) {
  return [...new Set(values.flatMap((v) => byLowercase.get(String(v).trim().toLowerCase()) ?? []))];
}

// One value from a fixed list, or "" when it isn't one
export const oneOf = (list: string[], value: unknown) => (list.includes(String(value ?? "")) ? String(value) : "");

// The work modes that suit someone looking for `mode`: "Either" suits both, and looking for "Either" takes anyone
export function suitedModes(mode: string) {
  if (mode === "In person" || mode === "Remote") return [mode, "Either"];
  return [];
}

// How a work mode reads on its own: "Either" means nothing out of context
export const workModeLabel = (mode: string) => (mode === "Either" ? "In person or remote" : mode);

// "Korean, English · 10-20 h/week · Remote · Seoul": whatever is set, in one short line
export function workStyleLine(p: { languages: string[]; hours_per_week: string; work_mode: string; city: string }) {
  return [p.languages.join(", "), p.hours_per_week && `${p.hours_per_week} h/week`, workModeLabel(p.work_mode), p.city.trim()].filter(Boolean).join(" · ");
}
