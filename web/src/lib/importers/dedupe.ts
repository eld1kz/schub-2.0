// The same event from two places: same title (ignoring case, spaces and punctuation), same start date and a link on
// the same site (ignoring www).

export const normalizeTitle = (title: string) => title.normalize("NFKC").toLowerCase().replace(/[^\p{L}\p{N}]+/gu, "");

export function urlDomain(url: string) {
  return URL.parse(url)?.hostname.toLowerCase().replace(/^www\./, "") ?? "";
}

export const dedupeKey = (e: { title: string; starts_at: string | null; url: string }) =>
  `${normalizeTitle(e.title)}|${e.starts_at ?? ""}|${urlDomain(e.url)}`;
