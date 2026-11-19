import { encode } from "uqr";
import { SOON_DAYS, daysUntil, nextDate } from "./opportunities";

// What the shareable team images (story and link preview) say, worked out from public team data only:
// title, roles, the event and its dates, and members' first names and photos.

type Dates = { deadline: string | null; starts_at: string | null; ends_at: string | null };

// "an iOS developer", "a Designer", "a UX designer", "an ML engineer"; roles in other scripts go without one
export function withArticle(role: string) {
  if (!/^[a-z]/i.test(role)) return role;
  // Acronyms go by how the first letter is said: "an M-L", "a U-X"
  const an = /^[A-Z]{2}/.test(role) ? /^[AEFHILMNORSX]/.test(role) : /^[aeiou]/i.test(role) && !/^(u[^n]|eu|one)/i.test(role);
  return `${an ? "an" : "a"} ${role}`;
}

// The big line, and the roles listed under it when there are too many to say
export function headline(open: string[], event: string | null): { line: string; list: string[] } {
  if (open.length === 0) return { line: event ? `Team set for ${event}` : "Team set", list: [] };
  if (open.length === 1) return { line: `We need ${withArticle(open[0])}`, list: [] };
  if (open.length === 2) return { line: `We need ${withArticle(open[0])} and ${withArticle(open[1])}`, list: [] };
  return { line: `We need ${open.length} more people`, list: open };
}

// "IMAGINE CUP · 12 DAYS LEFT", "OWN PROJECT", or just the name once the event is over.
// `soon`: the time left is within a week, so it shows in the accent.
export function eventLine(opportunity: ({ title: string } & Dates) | null, day: string) {
  if (!opportunity) return { name: "OWN PROJECT", left: null, soon: false };
  const next = nextDate(opportunity, day).date;
  const n = next === null ? null : daysUntil(next, day);
  const left = n === null ? null : n === 0 ? "TODAY" : n === 1 ? "1 DAY LEFT" : `${n} DAYS LEFT`;
  return { name: opportunity.title.toLocaleUpperCase("en-US"), left, soon: n !== null && n <= SOON_DAYS };
}

export const firstName = (name: string) => name.trim().split(/\s+/)[0] || "Member";

// Advance widths of Instrument Sans SemiBold for " " to "~", in hundredths of an em (from assets/fonts).
// Regular is a little narrower, so this errs on the side of wrapping early.
const LATIN = "19,30,45,73,64,79,77,26,44,44,43,54,28,49,28,44,68,39,56,58,62,58,62,56,60,62,28,28,54,54,54,58,87,73,64,75,76,63,59,76,72,25,43,71,59,90,72,79,67,81,66,64,66,70,73,109,71,70,63,44,44,44,54,47,35,56,62,55,62,57,37,62,61,26,26,56,26,94,61,60,62,62,39,49,41,60,54,80,59,54,51,44,23,44,54"
  .split(",")
  .map((n) => Number(n) / 100);

// Widths in ems: Plex Mono is 0.6 throughout; Hangul and Cyrillic come from Noto Sans KR (measured averages)
function charWidth(c: string, mono: boolean) {
  const code = c.codePointAt(0) ?? 0;
  if (/[ᄀ-ᇿ　-〿㄰-㆏가-힣]/.test(c)) return 0.95;
  if (mono) return 0.6;
  if (code >= 32 && code <= 126) return LATIN[code - 32];
  if (/[Ѐ-ӿ]/.test(c)) return c !== c.toLowerCase() ? 0.75 : 0.65;
  return 0.65;
}

const textWidth = (text: string, mono: boolean) => [...text].reduce((w, c) => w + charWidth(c, mono), 0);

// Greedy word wrap with the estimates above; a word wider than the line is split
export function wrap(text: string, size: number, width: number, mono = false) {
  const max = width / size;
  const lines: string[] = [];
  let line = "";
  for (const word of text.trim().split(/\s+/)) {
    const next = line ? `${line} ${word}` : word;
    if (textWidth(next, mono) <= max) {
      line = next;
      continue;
    }
    if (line) lines.push(line);
    line = "";
    for (const c of word) {
      if (textWidth(line + c, mono) > max && line) {
        lines.push(line);
        line = "";
      }
      line += c;
    }
  }
  if (line) lines.push(line);
  return lines;
}

// The largest size, stepping down from `max`, at which the text fits in `lines` lines
export function fitSize(text: string, width: number, lines: number, max: number, min: number) {
  for (let size = max; size > min; size -= 4) {
    if (wrap(text, size, width).length <= lines) return size;
  }
  return min;
}

// At most `lines` lines, the last one cut with an ellipsis
export function clampLines(text: string, size: number, width: number, lines: number, mono = false) {
  const wrapped = wrap(text, size, width, mono);
  if (wrapped.length <= lines) return wrapped.join(" ");
  let last = wrapped[lines - 1];
  while (last && textWidth(`${last}…`, mono) > width / size) last = last.slice(0, -1);
  return [...wrapped.slice(0, lines - 1), `${last.trimEnd()}…`].join(" ");
}

// Changes whenever what the images show changes, so a new share never gets a cached old image
export function storyVersion(team: {
  title: string;
  roles: string[];
  owner_id: string;
  opportunity: { id: string } | null;
  team_applications: { user_id: string; role: string; status: string }[];
}) {
  const accepted = team.team_applications.filter((a) => a.status === "accepted").map((a) => `${a.user_id}:${a.role}`).sort();
  const key = JSON.stringify([team.title, team.roles, team.owner_id, team.opportunity?.id ?? null, accepted]);
  let hash = 5381;
  for (let i = 0; i < key.length; i++) hash = (hash * 33) ^ key.charCodeAt(i);
  return (hash >>> 0).toString(36);
}

export type StoryTheme = "light" | "dark";

export const storyPath = (teamId: string, theme: StoryTheme, version: string) => `/teams/${teamId}/story.png?theme=${theme}&v=${version}`;

// A QR code as one SVG path in a size x size box (border included), for the images and the share dialog
export function qrPath(text: string) {
  const { size, data } = encode(text, { ecc: "M", border: 2 });
  let d = "";
  data.forEach((row, y) => row.forEach((on, x) => {
    if (on) d += `M${x} ${y}h1v1h-1z`;
  }));
  return { size, d };
}
