import { knownRoles } from "@/lib/roles";
import { knownLanguages, oneOf } from "@/lib/languages";
import { knownSkills } from "@/lib/skills";

// Discover's filters, as they live in the URL
// `mode` is "In person" or "Remote"; people who said Either count for both
export type PeopleQuery = { skills: string[]; open: boolean; role: string; lang: string; mode: string; page: number };

type Params = Record<string, string | string[] | undefined>;
const one = (v: string | string[] | undefined) => (typeof v === "string" ? v : "");

export function readPeopleQuery(params: Params): PeopleQuery {
  return {
    skills: knownSkills(one(params.skills).split(",")),
    open: one(params.open) === "1",
    role: knownRoles([one(params.role)])[0] ?? "",
    lang: knownLanguages([one(params.lang)])[0] ?? "",
    mode: oneOf(["In person", "Remote"], one(params.mode)),
    page: Math.max(1, Math.floor(Number(params.page)) || 1),
  };
}

// "?skills=React,C%2B%2B&open=1&role=Designer&lang=Korean&mode=Remote&page=2": each skill encoded on its own so the commas stay readable
export function peopleHref({ skills, open, role, lang, mode, page }: PeopleQuery) {
  const params = [
    skills.length > 0 && `skills=${skills.map(encodeURIComponent).join(",")}`,
    open && "open=1",
    role && `role=${encodeURIComponent(role)}`,
    lang && `lang=${encodeURIComponent(lang)}`,
    mode && `mode=${encodeURIComponent(mode)}`,
    page > 1 && `page=${page}`,
  ].filter(Boolean);
  return params.length ? `/people?${params.join("&")}` : "/people";
}
