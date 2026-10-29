import { requireUser } from "@/lib/supabase/server";
import { matchScore } from "@/lib/match";
import Link from "next/link";
import { respond } from "@/app/actions";
import { ConnectButton } from "../connect-button";

export default async function PeoplePage() {
  const { supabase, userId } = await requireUser();
  const [profiles, connections] = await Promise.all([
    supabase.from("profiles").select("id, name, university, bio, skills, interests, open_to_collaborate"),
    supabase.from("connections").select("id, sender_id, receiver_id, status, sender:profiles!sender_id(name)"),
  ]);

  const all = profiles.data ?? [];
  const me = all.find((p) => p.id === userId);
  const links = connections.data ?? [];
  const incoming = links.filter((c) => c.receiver_id === userId && c.status === "pending");
  const statusWith = (id: string) => links.find((c) => c.sender_id === id || c.receiver_id === id)?.status;

  const matches = all
    .filter((p) => p.id !== userId && p.name)
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

      <section className="divide-y divide-border border-t border-border">
        {matches.length === 0 && <p className="py-6 text-sm text-muted">No other students yet.</p>}
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
                <ConnectButton profileId={p.id} status={statusWith(p.id)} />
              </div>
            </article>
          );
        })}
      </section>
    </div>
  );
}
