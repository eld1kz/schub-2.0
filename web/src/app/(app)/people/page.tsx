import { requireUser } from "@/lib/supabase/server";
import { matchScore } from "@/lib/match";
import { knownSkills, SKILLS } from "@/lib/skills";
import Link from "next/link";
import { respond } from "@/app/actions";
import { ConnectButton } from "../connect-button";

const chipCount = 12;

// "?skills=React,C%2B%2B": each skill encoded on its own so the commas stay readable
const skillsHref = (skills: string[]) => (skills.length ? `/people?skills=${skills.map(encodeURIComponent).join(",")}` : "/people");

export default async function PeoplePage(props: PageProps<"/people">) {
  const { skills: skillsParam } = await props.searchParams;
  const selected = knownSkills(typeof skillsParam === "string" ? skillsParam.split(",") : []);
  const { supabase, userId, isGuest } = await requireUser();
  const [profiles, connections] = await Promise.all([
    supabase.from("profiles").select("id, name, university, bio, skills, interests, open_to_collaborate"),
    supabase.from("connections").select("id, sender_id, receiver_id, status, sender:profiles!sender_id(name), receiver:profiles!receiver_id(name)"),
  ]);

  const all = profiles.data ?? [];
  const me = all.find((p) => p.id === userId);
  const links = connections.data ?? [];
  const incoming = links.filter((c) => c.receiver_id === userId && c.status === "pending");
  const connected = links
    .filter((c) => c.status === "accepted")
    .map((c) => {
      const sent = c.sender_id === userId;
      const other = (sent ? c.receiver : c.sender) as unknown as { name: string } | null;
      return { id: sent ? c.receiver_id : c.sender_id, name: other?.name || "Unnamed" };
    });
  const statusWith = (id: string) => links.find((c) => c.sender_id === id || c.receiver_id === id)?.status;

  // Chips: the 12 skills most people have (listed order breaks ties), plus any already selected
  const counts = new Map<string, number>();
  for (const p of all) for (const s of knownSkills(p.skills)) counts.set(s, (counts.get(s) ?? 0) + 1);
  const top = [...SKILLS].sort((a, b) => (counts.get(b) ?? 0) - (counts.get(a) ?? 0)).slice(0, chipCount);
  const chips = [...top, ...selected.filter((s) => !top.includes(s))];

  const matches = all
    .filter((p) => p.id !== userId && p.name)
    // Must have every selected skill
    .filter((p) => {
      const has = knownSkills(p.skills);
      return selected.every((s) => has.includes(s));
    })
    .map((p) => ({ ...p, ...matchScore(p, me ?? { skills: [], interests: [], open_to_collaborate: true }) }))
    .sort((a, b) => Number(b.open_to_collaborate) - Number(a.open_to_collaborate) || b.score - a.score);

  return (
    <div className="space-y-10">
      {incoming.length > 0 && (
        <section>
          <h2 className="mb-3 text-sm font-medium">Requests</h2>
          {incoming.map((c) => (
            <div key={c.id} className="flex items-center justify-between py-2">
              <Link href={`/u/${c.sender_id}`} className="hover:underline">{(c.sender as unknown as { name: string } | null)?.name || "Unnamed"}</Link>
              <div className="flex gap-2">
                <form action={respond.bind(null, c.id, "accepted")}><button className="btn">Accept</button></form>
                <form action={respond.bind(null, c.id, "declined")}><button className="btn-outline">Decline</button></form>
              </div>
            </div>
          ))}
        </section>
      )}

      {connected.length > 0 && (
        <section>
          <h2 className="mb-3 text-sm font-medium">Your connections</h2>
          {connected.map((c) => (
            <div key={c.id} className="flex items-center justify-between py-2 text-sm">
              <Link href={`/u/${c.id}`} className="hover:underline">{c.name}</Link>
              <Link href={`/u/${c.id}`} className="text-muted hover:text-foreground">Contact details</Link>
            </div>
          ))}
        </section>
      )}

      <nav aria-label="Filter by skill" className="flex flex-wrap items-center gap-2">
        {chips.map((s) => {
          const on = selected.includes(s);
          return (
            <Link
              key={s}
              href={skillsHref(on ? selected.filter((x) => x !== s) : [...selected, s])}
              aria-current={on ? "true" : undefined}
              className={`rounded-full border px-3 py-1 text-sm ${on ? "border-indigo-600 bg-indigo-600 text-white dark:border-indigo-500 dark:bg-indigo-500" : "border-border text-muted hover:border-foreground hover:text-foreground"}`}
            >
              {s}
            </Link>
          );
        })}
        {selected.length > 0 && <Link href="/people" className="ml-1 text-sm text-muted underline hover:text-foreground">Clear filters</Link>}
      </nav>

      <section className="divide-y divide-border border-t border-border">
        {matches.length === 0 && (
          <p className="py-6 text-sm text-muted">{selected.length > 0 ? "Nobody has all of these skills yet." : "No other students yet."}</p>
        )}
        {matches.map((p) => {
          return (
            <article key={p.id} className="flex gap-4 py-5">
              <div className="flex-1">
                <p className="text-sm">
                  <Link href={`/u/${p.id}`} className="font-medium hover:underline">{p.name}</Link>
                  <span className="text-muted"> · {p.university || "—"}</span>
                </p>
                {p.bio && <p className="mt-1 text-sm">{p.bio}</p>}
                {p.complementary.length > 0 && <p className="mt-2 text-sm text-muted">Brings: {p.complementary.join(", ")}</p>}
                {!p.open_to_collaborate && <p className="mt-1 text-xs text-muted">Not looking for collaborators</p>}
              </div>
              <div className="flex flex-col items-end gap-2">
                <span className="text-sm tabular-nums">{p.score}%</span>
                <ConnectButton profileId={p.id} status={statusWith(p.id)} isGuest={isGuest} />
              </div>
            </article>
          );
        })}
      </section>
    </div>
  );
}
