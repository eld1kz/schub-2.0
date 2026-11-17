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
  start_date: string;
  end_date: string | null;
  description: string;
};

export const projectColumns = "id, title, tagline, description, role, built_at, result, year, url, repo_url, image_url, skills";
export const experienceColumns = "id, role, company, start_date, end_date, description";

// Uploaded images live in the public "media" bucket. Anything else stored in an image
// column is ignored, so a profile can't point the page at an arbitrary address.
export function mediaUrl(url: string | null | undefined) {
  const prefix = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/media/`;
  return url && url.startsWith(prefix) ? url : null;
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

const month = (day: string) => new Date(day).toLocaleDateString("en-US", { month: "short", year: "numeric", timeZone: "UTC" });

export function formatPeriod(start: string, end: string | null) {
  return `${month(start)} to ${end ? month(end) : "now"}`;
}
