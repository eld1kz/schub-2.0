import { UserSearch } from "lucide-react";
import Link from "next/link";
import { requireUser } from "@/lib/supabase/server";
import { matchReason, matchScore } from "@/lib/match";
import { knownSkills, SKILLS } from "@/lib/skills";
import { awardedIds } from "@/lib/awards";
import { ConnectButton } from "../connect-button";
import { PersonRow } from "./person-row";
import { PeopleFilters } from "./people-filters";
import { peopleHref, readPeopleQuery } from "./people-query";
import { suitedModes, workStyleLine } from "@/lib/languages";
import { Chip, ChipList, ButtonLink, EmptyState } from "@/components/ui";

const chipCount = 12;
const pageSize = 20;

export const instant = false;

// Discover: people you have no connection or pending request with, a page at a time. The query filters
// and pages; open-to-collaborate people come first, then the most recently updated. Within a page, the best
// match comes first (the score is computed in lib/match.ts, so it can't order the query itself).
export default async function PeoplePage(props: PageProps<"/people">) {
  const filters = readPeopleQuery(await props.searchParams);
  const { skills: selected, page } = filters;
  // Every filter but the page, for links that change one of them
  const at = (change: Partial<typeof filters>) => peopleHref({ ...filters, page: 1, ...change });
  const { supabase, userId, isGuest } = await requireUser();
  const [mine, connections, skillCounts, awarded] = await Promise.all([
    supabase.from("profiles").select("skills, interests, open_to_collaborate, languages").eq("id", userId).maybeSingle(),
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
    .select("id, name, headline, university, avatar_url, skills, interests, open_to_collaborate, wanted_roles, languages, hours_per_week, work_mode, city", { count: "exact" })
    .neq("name", "")
    .neq("id", userId)
    // Hidden by an admin (supabase/admin.sql)
    .is("hidden_at", null);
  if (elsewhere.length > 0) query = query.not("id", "in", `(${elsewhere.join(",")})`);
  // Must have every selected skill
  if (selected.length > 0) query = query.contains("skills", selected);
  // A role only counts while they're open to a team
  if (filters.open || filters.role) query = query.eq("open_to_collaborate", true);
  if (filters.role) query = query.contains("wanted_roles", [filters.role]);
  if (filters.lang) query = query.contains("languages", [filters.lang]);
  if (filters.mode) query = query.in("work_mode", suitedModes(filters.mode));
  const { data: people, count } = await query
    .order("open_to_collaborate", { ascending: false })
    .order("updated_at", { ascending: false })
    .order("id")
    .range((page - 1) * pageSize, page * pageSize - 1);
  const pages = Math.ceil((count ?? 0) / pageSize);
  const filtered = selected.length > 0 || filters.open || filters.role !== "" || filters.lang !== "" || filters.mode !== "";

  // Chips: the 12 skills most people have (listed order breaks ties), plus any already selected
  const counts = new Map<string, number>((skillCounts.data ?? []).map((r: { skill: string; people: number }) => [r.skill, Number(r.people)]));
  const top = [...SKILLS].sort((a, b) => (counts.get(b) ?? 0) - (counts.get(a) ?? 0)).slice(0, chipCount);
  const chips = [...top, ...selected.filter((s) => !top.includes(s))];

  const matches = (people ?? [])
    .map((p) => ({ ...p, score: matchScore(p, me).score, reason: matchReason(p, me) }))
    .sort((a, b) => Number(b.open_to_collaborate) - Number(a.open_to_collaborate) || b.score - a.score);

  return (
    <div className="flex flex-col gap-6">
      <PeopleFilters query={filters} />
      <nav aria-label="Filter by skill" className="flex flex-wrap items-center gap-1.5">
        {chips.map((s) => {
          const on = selected.includes(s);
          return (
            <Link
              key={s}
              href={at({ skills: on ? selected.filter((x) => x !== s) : [...selected, s] })}
              aria-current={on ? "true" : undefined}
              className={`rounded-sm px-2 py-1 text-sm ${on ? "bg-foreground font-medium text-background" : "border border-line2 text-ink2 hover:border-muted hover:text-foreground"}`}
            >
              {s}
            </Link>
          );
        })}
        {filtered && <Link href="/people" className="ml-2 text-sm font-medium text-accent hover:underline">Clear filters</Link>}
      </nav>

      {matches.length === 0 ? (
        <EmptyState
          icon={UserSearch}
          action={<ButtonLink href={filtered ? "/people" : "/people/connections"} variant="secondary" size="sm">{filtered ? "Clear filters" : "See your connections"}</ButtonLink>}
        >
          {filtered ? "No one matches these filters." : "You've connected with or asked everyone here so far."}
        </EmptyState>
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
                open={p.open_to_collaborate}
                actions={
                  <>
                    <span className="text-meta text-muted tabular-nums">{p.score}% match</span>
                    <ConnectButton profileId={p.id} status={statusWith(p.id)} isGuest={isGuest} size="sm" />
                  </>
                }
              >
                {p.university && <p className="text-meta text-muted">{p.university}</p>}
                {workStyleLine(p) && <p className="text-meta text-ink2">{workStyleLine(p)}</p>}
                {(skills.length > 0 || p.reason) && (
                  <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1.5">
                    {skills.length > 0 && (
                      <ChipList>
                        {skills.map((s) => <Chip key={s}>{s}</Chip>)}
                      </ChipList>
                    )}
                    {p.reason && <p className="text-meta font-medium text-accent">{p.reason}</p>}
                  </div>
                )}
                {p.open_to_collaborate && (
                  <p className="text-meta">
                    {p.wanted_roles.length > 0 ? <><span className="text-muted">Open to:</span> {p.wanted_roles.join(", ")}</> : <span className="text-muted">Open to a team</span>}
                  </p>
                )}
                {!p.open_to_collaborate && <p className="text-meta text-muted">Not open to a team</p>}
              </PersonRow>
            );
          })}
        </div>
      )}

      {pages > 1 && (
        <nav aria-label="Pages" className="flex items-center justify-between border-t border-border pt-4 text-sm">
          {page > 1 ? <Link href={at({ page: page - 1 })} className="font-semibold text-accent hover:underline">Previous</Link> : <span />}
          <span className="text-muted tabular-nums">Page {page} of {pages}</span>
          {page < pages ? <Link href={at({ page: page + 1 })} className="font-semibold text-accent hover:underline">Next</Link> : <span />}
        </nav>
      )}
    </div>
  );
}
