import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/supabase/server";
import { matchScore } from "@/lib/match";
import { formatDay, opportunityTypes, type OpportunityType } from "@/lib/opportunities";
import { deleteOpportunity, lookForTeam, reportOpportunity, stopLooking } from "@/app/actions";
import { ConnectButton } from "../../connect-button";

type Person = { id: string; name: string; university: string; skills: string[]; interests: string[]; open_to_collaborate: boolean };

export default async function OpportunityPage(props: PageProps<"/opportunities/[id]">) {
  const { id } = await props.params;
  const { supabase, userId } = await requireUser();
  const [opportunity, participants, me, connections, myReport, admin] = await Promise.all([
    supabase.from("opportunities").select("*").eq("id", id).maybeSingle(),
    supabase
      .from("opportunity_participants")
      .select("user_id, note, person:profiles(id, name, university, skills, interests, open_to_collaborate)")
      .eq("opportunity_id", id)
      .order("created_at"),
    supabase.from("profiles").select("skills, interests, open_to_collaborate").eq("id", userId).single(),
    supabase.from("connections").select("sender_id, receiver_id, status"),
    supabase.from("opportunity_reports").select("reason").eq("opportunity_id", id).eq("user_id", userId).maybeSingle(),
    supabase.rpc("is_admin"),
  ]);
  const o = opportunity.data;
  if (!o) notFound();

  const all = participants.data ?? [];
  const mine = all.find((p) => p.user_id === userId);
  const statusWith = (pid: string) => (connections.data ?? []).find((c) => c.sender_id === pid || c.receiver_id === pid)?.status;
  const others = all
    .filter((p) => p.user_id !== userId)
    .map((p) => {
      const person = p.person as unknown as Person;
      return { ...p, person, ...matchScore(person, me.data ?? { skills: [], interests: [], open_to_collaborate: true }) };
    })
    .sort((a, b) => b.score - a.score);

  return (
    <div className="space-y-10">
      <section>
        <p className="text-sm text-muted">{opportunityTypes[o.type as OpportunityType]}{o.organizer && ` · ${o.organizer}`}</p>
        <h1 className="mt-1 text-xl font-semibold">{o.title}</h1>
        <p className="mt-1 text-sm text-muted">
          {[o.location, o.starts_at && `Starts ${formatDay(o.starts_at)}`, o.deadline && `Apply by ${formatDay(o.deadline)}`].filter(Boolean).join(" · ")}
        </p>
        {o.status !== "live" && <p className="mt-2 text-xs text-muted uppercase">{o.status}</p>}
        {o.description && <p className="mt-4 whitespace-pre-wrap">{o.description}</p>}
        <div className="mt-4 flex items-center gap-4 text-sm">
          <a href={o.url} target="_blank" rel="noreferrer" className="underline">Official page</a>
          {(o.submitted_by === userId || admin.data) && (
            <form action={deleteOpportunity.bind(null, o.id)}><button className="text-muted hover:text-foreground">Delete</button></form>
          )}
        </div>
      </section>

      <section className="rounded-md border border-border p-4">
        {mine ? (
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium">You&apos;re looking for a team</p>
              {mine.note && <p className="mt-1 text-sm text-muted">{mine.note}</p>}
            </div>
            <form action={stopLooking.bind(null, o.id)}><button className="btn-outline">Stop looking</button></form>
          </div>
        ) : (
          <form action={lookForTeam.bind(null, o.id)} className="space-y-2">
            <label className="label" htmlFor="note">Looking for a team? Say what you&apos;d bring (optional)</label>
            <input id="note" name="note" maxLength={300} placeholder="Frontend dev, want to do the AI track" className="input" />
            <button className="btn">I&apos;m looking for a team</button>
          </form>
        )}
      </section>

      <section>
        <h2 className="mb-1 text-sm font-medium">Looking for a team ({others.length})</h2>
        <div className="divide-y divide-border border-t border-border">
          {others.length === 0 && <p className="py-4 text-sm text-muted">Nobody else yet.</p>}
          {others.map((p) => (
            <article key={p.user_id} className="flex gap-4 py-4">
              <div className="flex-1">
                <p className="text-sm">
                  <Link href={`/u/${p.user_id}`} className="font-medium hover:underline">{p.person.name || "Unnamed"}</Link>
                  <span className="text-muted"> · {p.person.university || "—"}</span>
                </p>
                {p.note && <p className="mt-1 text-sm">{p.note}</p>}
                {p.person.skills.length > 0 && <p className="mt-1 text-sm text-muted">Skills: {p.person.skills.join(", ")}</p>}
              </div>
              <div className="flex flex-col items-end gap-2">
                <span className="text-sm tabular-nums">{p.score}%</span>
                <ConnectButton profileId={p.user_id} status={statusWith(p.user_id)} />
              </div>
            </article>
          ))}
        </div>
      </section>

      {o.submitted_by !== userId && (
        <section className="text-sm text-muted">
          {myReport.data ? (
            <p>You reported this as {myReport.data.reason}.</p>
          ) : (
            <form action={reportOpportunity.bind(null, o.id)} className="flex items-center gap-2">
              <span>Something wrong?</span>
              <select name="reason" className="rounded-md border border-border bg-transparent px-2 py-1">
                <option value="fake">Fake or spam</option>
                <option value="duplicate">Duplicate</option>
                <option value="expired">Expired</option>
                <option value="other">Other</option>
              </select>
              <button className="underline hover:text-foreground">Report</button>
            </form>
          )}
        </section>
      )}
    </div>
  );
}
