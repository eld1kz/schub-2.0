import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/supabase/server";
import { openRoles } from "@/lib/teams";
import { applyToTeam, deleteTeam, respondToApplication, withdrawApplication } from "@/app/actions";
import { SignInButton } from "../../sign-in";

type Application = {
  id: string;
  user_id: string;
  role: string;
  note: string;
  status: "pending" | "accepted" | "declined";
  person: { name: string; university: string; skills: string[] } | null;
};

export default async function TeamPage(props: PageProps<"/teams/[id]">) {
  const { id } = await props.params;
  const { supabase, userId, isGuest } = await requireUser();
  const [team, applicationRows] = await Promise.all([
    supabase.from("teams").select("id, title, description, roles, owner_id, owner:profiles(name), opportunity:opportunities(id, title)").eq("id", id).maybeSingle(),
    // Row level security returns accepted members, your own application, and everything if you own the team
    supabase.from("team_applications").select("id, user_id, role, note, status, person:profiles(name, university, skills)").eq("team_id", id).order("created_at"),
  ]);
  const t = team.data;
  if (!t) notFound();

  const owner = t.owner as unknown as { name: string } | null;
  const opportunity = t.opportunity as unknown as { id: string; title: string } | null;
  const applications = (applicationRows.data ?? []) as unknown as Application[];
  const isOwner = t.owner_id === userId;
  const mine = applications.find((a) => a.user_id === userId);
  const members = applications.filter((a) => a.status === "accepted");
  const pending = applications.filter((a) => a.status === "pending" && a.user_id !== userId);
  const open = openRoles({ roles: t.roles, team_applications: applications });

  return (
    <div className="space-y-10">
      <section>
        {opportunity && <p className="text-sm text-muted">For <Link href={`/opportunities/${opportunity.id}`} className="underline">{opportunity.title}</Link></p>}
        <h1 className="mt-1 text-xl font-semibold">{t.title}</h1>
        <p className="mt-1 text-sm text-muted">
          Posted by <Link href={`/u/${t.owner_id}`} className="underline">{isOwner ? "you" : owner?.name || "Unnamed"}</Link>
        </p>
        {t.description && <p className="mt-4 whitespace-pre-wrap">{t.description}</p>}
        {isOwner && (
          <form action={deleteTeam.bind(null, t.id)} className="mt-4 text-sm"><button className="text-muted hover:text-foreground">Delete team</button></form>
        )}
      </section>

      <section>
        <h2 className="mb-1 text-sm font-medium">Roles</h2>
        <div className="divide-y divide-border border-t border-border text-sm">
          {(t.roles as string[]).map((role) => {
            const member = members.find((m) => m.role === role);
            return (
              <div key={role} className="flex items-center justify-between gap-4 py-3">
                <span>{role}</span>
                {member ? (
                  <Link href={`/u/${member.user_id}`} className="underline">{member.user_id === userId ? "You" : member.person?.name || "Unnamed"}</Link>
                ) : (
                  <span className="text-muted">Open</span>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {isOwner && (
        <section>
          <h2 className="mb-1 text-sm font-medium">Applications ({pending.length})</h2>
          <div className="divide-y divide-border border-t border-border">
            {pending.length === 0 && <p className="py-4 text-sm text-muted">Nobody has applied yet.</p>}
            {pending.map((a) => (
              <article key={a.id} className="flex flex-col gap-3 py-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="text-sm">
                  <p>
                    <Link href={`/u/${a.user_id}`} className="font-medium hover:underline">{a.person?.name || "Unnamed"}</Link>
                    <span className="text-muted"> · {a.person?.university || "—"} · for {a.role}</span>
                  </p>
                  {a.note && <p className="mt-1">{a.note}</p>}
                  {(a.person?.skills ?? []).length > 0 && <p className="mt-1 text-muted">Skills: {a.person?.skills.join(", ")}</p>}
                </div>
                <div className="flex gap-2">
                  <form action={respondToApplication.bind(null, t.id, a.id, "accepted")}><button className="btn">Accept</button></form>
                  <form action={respondToApplication.bind(null, t.id, a.id, "declined")}><button className="btn-outline">Decline</button></form>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}

      {isGuest && open.length > 0 && (
        <section className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-border p-4">
          <p className="text-sm">Want one of these roles?</p>
          <SignInButton label="Sign in to apply" />
        </section>
      )}

      {!isOwner && !isGuest && (
        <section className="rounded-md border border-border p-4">
          {mine?.status === "accepted" && (
            <p className="text-sm">
              <span className="font-medium">You&apos;re on this team as {mine.role}.</span>{" "}
              <Link href={`/u/${t.owner_id}`} className="underline">See how to reach {owner?.name || "the owner"}</Link>
            </p>
          )}
          {mine?.status === "declined" && <p className="text-sm text-muted">Your application for {mine.role} wasn&apos;t accepted.</p>}
          {mine?.status === "pending" && (
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-medium">You applied for {mine.role}</p>
                <p className="mt-1 text-sm text-muted">Waiting for {owner?.name || "the owner"} to respond.</p>
              </div>
              <form action={withdrawApplication.bind(null, t.id)}><button className="btn-outline">Withdraw</button></form>
            </div>
          )}
          {!mine && open.length === 0 && <p className="text-sm text-muted">All roles are filled.</p>}
          {!mine && open.length > 0 && (
            <form action={applyToTeam.bind(null, t.id)} className="space-y-3">
              <div>
                <label className="label" htmlFor="role">Apply for</label>
                <select id="role" name="role" className="input">
                  {open.map((role) => <option key={role} value={role}>{role}</option>)}
                </select>
              </div>
              <div>
                <label className="label" htmlFor="note">Why you (optional)</label>
                <input id="note" name="note" maxLength={300} placeholder="Built two React apps, free every evening" className="input" />
              </div>
              <button className="btn">Apply</button>
            </form>
          )}
        </section>
      )}
    </div>
  );
}
