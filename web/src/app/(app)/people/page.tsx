import Link from "next/link";
import { requireUser } from "@/lib/supabase/server";
import { matchReason, matchScore } from "@/lib/match";
import { knownSkills, SKILLS } from "@/lib/skills";
import { awardedIds } from "@/lib/awards";
import { ConnectButton } from "../connect-button";
import { PersonRow } from "./person-row";

const chipCount = 12;
const pageSize = 20;

// "?skills=React,C%2B%2B&page=2": each skill encoded on its own so the commas stay readable
function peopleHref(skills: string[], page = 1) {
  const params = [skills.length > 0 && `skills=${skills.map(encodeURIComponent).join(",")}`, page > 1 && `page=${page}`].filter(Boolean);
  return params.length ? `/people?${params.join("&")}` : "/people";
}

export const instant = false;

// Discover: people you have no connection or pending request with, a page at a time. The query filters
// and pages; open-to-collaborate people come first, then the most recently updated. Within a page, the best
// match comes first (the score is computed in lib/match.ts, so it can't order the query itself).
export default async function PeoplePage(props: PageProps<"/people">) {
  const { skills: skillsParam, page: pageParam } = await props.searchParams;
  const selected = knownSkills(typeof skillsParam === "string" ? skillsParam.split(",") : []);
  const page = Math.max(1, Math.floor(Number(pageParam)) || 1);
  const { supabase, userId, isGuest } = await requireUser();
  const [mine, connections, skillCounts, awarded] = await Promise.all([
    supabase.from("profiles").select("skills, interests, open_to_collaborate").eq("id", userId).maybeSingle(),
    supabase.from("connections").select("sender_id, receiver_id, status"),
    // How many people have each skill (supabase/people-discover.sql)
    supabase.rpc("skill_counts"),
    awardedIds(supabase),
  ]);

  const me = mine.data ?? { skills: [], interests: [], open_to_collaborate: true };
  const links = connections.data ?? [];
  const statusWith = (id: string) => links.find((c) => c.sender_id === id || c.receiver_id === id)?.status as string | undefined;
  // Connected and pending people live in the other tabs
  const elsewhere = links.filter((c) => c.status !== "declined").map((c) => (c.sender_id === userId ? c.receiver_id : c.sender_id));

  let query = supabase
    .from("profiles")
    .select("id, name, headline, university, avatar_url, skills, interests, open_to_collaborate", { count: "exact" })
    .neq("name", "")
    .neq("id", userId);
  if (elsewhere.length > 0) query = query.not("id", "in", `(${elsewhere.join(",")})`);
  // Must have every selected skill
  if (selected.length > 0) query = query.contains("skills", selected);
  const { data: people, count } = await query
    .order("open_to_collaborate", { ascending: false })
    .order("updated_at", { ascending: false })
    .order("id")
    .range((page - 1) * pageSize, page * pageSize - 1);
  const pages = Math.ceil((count ?? 0) / pageSize);

  // Chips: the 12 skills most people have (listed order breaks ties), plus any already selected
  const counts = new Map<string, number>((skillCounts.data ?? []).map((r: { skill: string; people: number }) => [r.skill, Number(r.people)]));
  const top = [...SKILLS].sort((a, b) => (counts.get(b) ?? 0) - (counts.get(a) ?? 0)).slice(0, chipCount);
  const chips = [...top, ...selected.filter((s) => !top.includes(s))];

  const matches = (people ?? [])
    .map((p) => ({ ...p, score: matchScore(p, me).score, reason: matchReason(p, me) }))
    .sort((a, b) => Number(b.open_to_collaborate) - Number(a.open_to_collaborate) || b.score - a.score);

  return (
    <div className="flex flex-col gap-6">
      <nav aria-label="Filter by skill" className="flex flex-wrap items-center gap-1.5">
        {chips.map((s) => {
          const on = selected.includes(s);
          return (
            <Link
              key={s}
              href={peopleHref(on ? selected.filter((x) => x !== s) : [...selected, s])}
              aria-current={on ? "true" : undefined}
              className={`rounded px-2.5 py-1 text-sm ${on ? "bg-foreground font-medium text-background" : "border border-line2 text-ink2 hover:border-muted hover:text-foreground"}`}
            >
              {s}
            </Link>
          );
        })}
        {selected.length > 0 && <Link href="/people" className="ml-2 text-sm font-medium text-accent hover:underline">Clear filters</Link>}
      </nav>

      {matches.length === 0 ? (
        <div className="flex flex-col items-start gap-2 border-t border-border py-8">
          <p className="text-[15px] font-medium">{selected.length > 0 ? "No one matches these filters" : "No one new to discover right now"}</p>
          {selected.length > 0 ? (
            <Link href="/people" className="text-sm font-semibold text-accent hover:underline">Clear filters</Link>
          ) : (
            <p className="text-sm text-ink2">You&apos;ve connected with or asked everyone here so far.</p>
          )}
        </div>
      ) : (
        <div className="flex flex-col">
          {matches.map((p) => {
            const skills = knownSkills(p.skills).slice(0, 3);
            return (
              <PersonRow
                key={p.id}
                id={p.id}
                name={p.name}
                headline={p.headline}
                avatarUrl={p.avatar_url}
                awarded={awarded.has(p.id)}
                actions={
                  <>
                    <span className="text-[13px] text-muted tabular-nums">{p.score}% match</span>
                    <ConnectButton profileId={p.id} status={statusWith(p.id)} isGuest={isGuest} className="btn-outline h-9" />
                  </>
                }
              >
                {p.university && <p className="text-[13px] text-muted">{p.university}</p>}
                {(skills.length > 0 || p.reason) && (
                  <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1.5">
                    {skills.length > 0 && (
                      <ul className="flex flex-wrap gap-1.5">
                        {skills.map((s) => <li key={s} className="skill px-1.5 text-xs">{s}</li>)}
                      </ul>
                    )}
                    {p.reason && <p className="text-[13px] font-medium text-accent">{p.reason}</p>}
                  </div>
                )}
                {!p.open_to_collaborate && <p className="text-[13px] text-muted">Not looking for collaborators</p>}
              </PersonRow>
            );
          })}
        </div>
      )}

      {pages > 1 && (
        <nav aria-label="Pages" className="flex items-center justify-between border-t border-border pt-5 text-sm">
          {page > 1 ? <Link href={peopleHref(selected, page - 1)} className="font-semibold text-accent hover:underline">Previous</Link> : <span />}
          <span className="text-muted tabular-nums">Page {page} of {pages}</span>
          {page < pages ? <Link href={peopleHref(selected, page + 1)} className="font-semibold text-accent hover:underline">Next</Link> : <span />}
        </nav>
      )}
    </div>
  );
}
