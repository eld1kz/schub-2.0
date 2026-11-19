export type Project = {
  id: string;
  title: string;
  tagline: string;
  description: string;
  role: string;
  built_at: string;
  result: string;
  year: number | null;
  url: string;
  repo_url: string;
  image_url: string;
  skills: string[];
};

export type Experience = {
  id: string;
  role: string;
  company: string;
  type: string;
  location: string;
  remote: boolean;
  start_date: string;
  end_date: string | null;
  description: string;
  skills: string[];
};

// The allowed values of experiences.type (supabase/experience-details.sql); empty means not set
export const EXPERIENCE_TYPES = ["Internship", "Part-time", "Full-time", "Research", "Club / Society", "Freelance", "Volunteer", "Hackathon team"];

// The form allows less than the column (600), which older entries may already use
export const EXPERIENCE_DESCRIPTION_MAX = 400;

export const projectColumns = "id, title, tagline, description, role, built_at, result, year, url, repo_url, image_url, skills";
export const experienceColumns = "id, role, company, type, location, remote, start_date, end_date, description, skills";

const mediaPrefix = () => `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/media/`;

// Uploaded images live in the public "media" bucket. Anything else stored in an image
// column is ignored, so a profile can't point the page at an arbitrary address.
export function mediaUrl(url: string | null | undefined) {
  return url && url.startsWith(mediaPrefix()) ? url : null;
}

// A profile photo: an uploaded one, else the Google or GitHub account photo (account-photos.sql copies it into
// avatar_url, only from those two image hosts). Both come small by default; ask for 256px.
export function photoUrl(url: string | null | undefined) {
  const own = mediaUrl(url);
  if (own) return own;
  if (!url || /[\s"'<>]/.test(url)) return null;
  if (url.startsWith("https://lh3.googleusercontent.com/")) return url.replace(/=s\d+(-c)?$/, "=s256-c");
  // Always the same query (next.config allows only this one)
  if (url.startsWith("https://avatars.githubusercontent.com/")) return `https://avatars.githubusercontent.com${new URL(url).pathname}?v=4&s=256`;
  return null;
}

// Where an uploaded image sits in the bucket ("<user id>/<file>"), or null for anything else
export function mediaPath(url: string | null | undefined) {
  const image = mediaUrl(url);
  return image ? decodeURIComponent(image.slice(mediaPrefix().length)) : null;
}

// Links are typed in by users; only plain web links are ever rendered as links.
export function webLink(url: string | null | undefined) {
  return url && /^https?:\/\//i.test(url) ? url : null;
}

// Turns what someone typed ("github.com/me", "me", "https://…") into a full link, or "" if it can't be one.
export function toLink(value: string, handleBase?: string) {
  const text = value.trim();
  if (!text) return "";
  if (handleBase && /^@?[\w.-]+$/.test(text) && !text.includes(".")) return handleBase + text.replace(/^@/, "");
  const url = URL.parse(/^https?:\/\//i.test(text) ? text : `https://${text}`);
  return url && url.hostname.includes(".") ? url.href : "";
}

// "Mar 2025"
export const formatMonth = (day: string) => new Date(day).toLocaleDateString("en-US", { month: "short", year: "numeric", timeZone: "UTC" });

// "Mar 2025 – Present · 1 yr 9 mos". The length counts the first and last month, like LinkedIn.
// `now` is today for entries without an end.
export function formatPeriod(start: string, end: string | null, now = new Date()) {
  const from = new Date(start);
  const to = end ? new Date(end) : now;
  const months = Math.max(0, (to.getUTCFullYear() - from.getUTCFullYear()) * 12 + to.getUTCMonth() - from.getUTCMonth() + 1);
  const years = Math.floor(months / 12);
  const rest = months % 12;
  const length = [years > 0 && `${years} ${years === 1 ? "yr" : "yrs"}`, rest > 0 && `${rest} ${rest === 1 ? "mo" : "mos"}`].filter(Boolean).join(" ");
  return `${formatMonth(start)} – ${end ? formatMonth(end) : "Present"}${length ? ` · ${length}` : ""}`;
}

// Current roles first, then the newest start first
export function sortExperiences<T extends { start_date: string; end_date: string | null }>(entries: T[]) {
  return [...entries].sort((a, b) => Number(a.end_date !== null) - Number(b.end_date !== null) || b.start_date.localeCompare(a.start_date));
}
