import type { ReactNode } from "react";
import Link from "next/link";
import { requireUser } from "@/lib/supabase/server";
import { answerInvite, withdrawApplication } from "@/app/actions";
import { teamSummaryColumns, type TeamSummary } from "@/lib/teams";
import { awardedIds } from "@/lib/awards";
import { myConnections } from "@/lib/connections";
import { TeamList } from "../../../team-list";

export const instant = false;

type MyApplication = {
  id: string;
  team_id: string;
  role: string;
  status: "pending" | "accepted" | "declined";
  // "invite": the team's owner invited you
  direction: "application" | "invite";
  created_at: string;
  team: { id: string; title: string; owner: { name: string } | null } | null;
};

const declinedFor = 14 * 24 * 60 * 60 * 1000;

function Heading({ title, count }: { title: string; count: number }) {
  return (
    <h2 className="mb-4 text-[15px] font-semibold">
      {title} <span className="font-normal text-muted">{count}</span>
    </h2>
  );
}

// One of your teams or applications: the team, a line about you on it, and an action on the right
function Row({ teamId, title, children, action }: { teamId: string; title: string; children: ReactNode; action?: ReactNode }) {
  return (
    <article className="flex items-center justify-between gap-4 border-b border-border py-4 first:pt-0">
      <div className="flex min-w-0 flex-col gap-1">
        <Link href={`/teams/${teamId}`} className="w-fit text-base font-semibold hover:text-accent">{title}</Link>
        <p className="text-sm text-ink2">{children}</p>
      </div>
      {action}
    </article>
  );
}

// Invitations waiting for your answer, teams you run, teams you're on, and applications still waiting or recently declined
export default async function YourTeamsPage() {
  const { supabase, userId, isGuest } = await requireUser();
  const [owned, applications, declines, awarded, connections] = await Promise.all([
    supabase.from("teams").select(teamSummaryColumns).eq("owner_id", userId).order("created_at", { ascending: false }),
    supabase
      .from("team_applications")
      .select("id, team_id, role, status, direction, created_at, team:teams(id, title, owner:profiles(name))")
      .eq("user_id", userId)
      .order("created_at", { ascending: false }),
    // The decline notification says when an application was declined
    supabase.from("notifications").select("link, created_at").eq("user_id", userId).eq("type", "application_declined"),
    awardedIds(supabase),
    myConnections(supabase, userId, isGuest),
  ]);
  const running = (owned.data ?? []) as unknown as TeamSummary[];
  const mine = ((applications.data ?? []) as unknown as MyApplication[]).filter((a) => a.team);
  const declinedAt = new Map<string, number>();
  for (const n of declines.data ?? []) {
    declinedAt.set(n.link, Math.max(declinedAt.get(n.link) ?? 0, Date.parse(n.created_at)));
  }
  const now = new Date().getTime();
  const memberOf = mine.filter((a) => a.status === "accepted");
  const invitations = mine.filter((a) => a.direction === "invite" && a.status === "pending");
  // Declined ones drop off 14 days after the decline (or after applying, if the notification is missing)
  const pendingOrDeclined = mine.filter(
    (a) =>
      a.direction === "application" &&
      (a.status === "pending" || (a.status === "declined" && now - (declinedAt.get(`/teams/${a.team_id}`) ?? Date.parse(a.created_at)) < declinedFor)),
  );

  if (invitations.length === 0 && running.length === 0 && memberOf.length === 0 && pendingOrDeclined.length === 0) {
    return (
      <div className="flex flex-col items-start gap-3 py-2">
        <p className="text-[15px] font-medium">You&apos;re not on any team yet</p>
        <div className="flex flex-wrap gap-2">
          <Link href="/teams/new" className="btn">Post a team</Link>
          <Link href="/teams" className="btn-outline">Find teams</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-10">
      {invitations.length > 0 && (
        <section>
          <Heading title="Invitations" count={invitations.length} />
          {invitations.map((a) => (
            <Row
              key={a.id}
              teamId={a.team_id}
              title={a.team?.title ?? ""}
              action={
                <div className="flex shrink-0 gap-2">
                  <form action={answerInvite.bind(null, a.id, "accepted")}><button aria-label={`Accept the invitation to ${a.team?.title ?? ""}`} className="btn h-9 px-4">Accept</button></form>
                  <form action={answerInvite.bind(null, a.id, "declined")}><button aria-label={`Decline the invitation to ${a.team?.title ?? ""}`} className="btn-outline h-9">Decline</button></form>
                </div>
              }
            >
              <span className="text-foreground">{a.role}</span> · Invited by {a.team?.owner?.name || "Unnamed"}
            </Row>
          ))}
        </section>
      )}

      {running.length > 0 && (
        <section>
          <Heading title="Running" count={running.length} />
          <TeamList teams={running} userId={userId} awarded={awarded} connections={connections} share empty="" />
        </section>
      )}

      {memberOf.length > 0 && (
        <section>
          <Heading title="Member of" count={memberOf.length} />
          {memberOf.map((a) => (
            <Row key={a.id} teamId={a.team_id} title={a.team?.title ?? ""}>
              <span className="text-foreground">{a.role}</span> · Started by {a.team?.owner?.name || "Unnamed"}
            </Row>
          ))}
        </section>
      )}

      {pendingOrDeclined.length > 0 && (
        <section>
          <Heading title="Applications" count={pendingOrDeclined.length} />
          {pendingOrDeclined.map((a) => (
            <Row
              key={a.id}
              teamId={a.team_id}
              title={a.team?.title ?? ""}
              action={a.status === "pending" && (
                <form action={withdrawApplication.bind(null, a.team_id)}><button className="h-9 text-sm text-ink2 hover:text-foreground">Withdraw</button></form>
              )}
            >
              {a.role} ·{" "}
              {a.status === "pending" ? <span className="font-medium text-accent">Pending</span> : <span className="text-muted">Declined</span>}
            </Row>
          ))}
        </section>
      )}
    </div>
  );
}
