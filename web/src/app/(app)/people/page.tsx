import Link from "next/link";
import { requireUser } from "@/lib/supabase/server";
import { matchReason, matchScore } from "@/lib/match";
import { knownSkills, SKILLS } from "@/lib/skills";
import { awardedIds } from "@/lib/awards";
import { ConnectButton } from "../connect-button";
import { PersonRow } from "./person-row";

const chipCount = 12;

// "?skills=React,C%2B%2B": each skill encoded on its own so the commas stay readable
const skillsHref = (skills: string[]) => (skills.length ? `/people?skills=${skills.map(encodeURIComponent).join(",")}` : "/people");

export const instant = false;

// Discover: people you have no connection or pending request with, best match first
export default async function PeoplePage(props: PageProps<"/people">) {
  const { skills: skillsParam } = await props.searchParams;
  const selected = knownSkills(typeof skillsParam === "string" ? skillsParam.split(",") : []);
  const { supabase, userId, isGuest } = await requireUser();
  const [profiles, connections, awarded] = await Promise.all([
    supabase.from("profiles").select("id, name, headline, university, avatar_url, skills, interests, open_to_collaborate"),
    supabase.from("connections").select("sender_id, receiver_id, status"),
    awardedIds(supabase),
  ]);

  const all = profiles.data ?? [];
  const me = all.find((p) => p.id === userId) ?? { skills: [], interests: [], open_to_collaborate: true };
  const links = connections.data ?? [];
  const statusWith = (id: string) => links.find((c) => c.sender_id === id || c.receiver_id === id)?.status as string | undefined;

  // Chips: the 12 skills most people have (listed order breaks ties), plus any already selected
  const counts = new Map<string, number>();
  for (const p of all) for (const s of knownSkills(p.skills)) counts.set(s, (counts.get(s) ?? 0) + 1);
  const top = [...SKILLS].sort((a, b) => (counts.get(b) ?? 0) - (counts.get(a) ?? 0)).slice(0, chipCount);
  const chips = [...top, ...selected.filter((s) => !top.includes(s))];

  const matches = all
    .filter((p) => p.id !== userId && p.name)
    // Connected and pending people live in the other tabs
    .filter((p) => {
      const status = statusWith(p.id);
      return status !== "accepted" && status !== "pending";
    })
    // Must have every selected skill
    .filter((p) => {
      const has = knownSkills(p.skills);
      return selected.every((s) => has.includes(s));
    })
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
              href={skillsHref(on ? selected.filter((x) => x !== s) : [...selected, s])}
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
    </div>
  );
}
