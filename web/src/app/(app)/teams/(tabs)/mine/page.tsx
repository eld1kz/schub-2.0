import { Users } from "lucide-react";
import type { ReactNode } from "react";
import Link from "next/link";
import { requireUser } from "@/lib/supabase/server";
import { answerInvite, withdrawApplication } from "@/app/actions";
import { openRoles, recruitingRoles, teamSummaries, teamSummaryColumns, withCurrentEvent, type TeamSummary } from "@/lib/teams";
import { today } from "@/lib/opportunities";
import { awardedIds } from "@/lib/awards";
import { myConnections } from "@/lib/connections";
import { TeamList } from "../../../team-list";
import { TeamRowSlots } from "../../../team-row-slots";
import { toSlots } from "../../../to-slots";
import { Row, AnswerButtons, SubmitButton, ButtonLink, EmptyState } from "@/components/ui";

export const instant = false;

type MyApplication = {
  id: string;
  team_id: string;
  role: string;
  status: "pending" | "accepted" | "declined";
  // "invite": the team's owner invited you
  direction: "application" | "invite";
  created_at: string;
  team: TeamSummary | null;
};

const declinedFor = 14 * 24 * 60 * 60 * 1000;

function Heading({ title, count }: { title: string; count: number }) {
  return (
    <h2 className="mb-4 text-base font-semibold">
      {title} <span className="font-normal text-muted">{count}</span>
    </h2>
  );
}

// One of your teams or applications: the team, a line about you on it, and an action on the right
function TeamRow({ teamId, title, children, action, slots }: { teamId: string; title: string; children: ReactNode; action?: ReactNode; slots?: ReactNode }) {
  return (
    <Row center flush actions={action} href={`/teams/${teamId}`}>
      <Link href={`/teams/${teamId}`} data-row-main className="w-fit text-base font-semibold hover:text-accent">{title}</Link>
      <p className="text-sm text-ink2">{children}</p>
      {slots && <div className="py-1">{slots}</div>}
    </Row>
  );
}

// Invitations waiting for your answer, teams you run, teams you're on, and applications still waiting or recently declined
export default async function YourTeamsPage() {
  const { supabase, userId, isGuest } = await requireUser();
  const [owned, applications, declines, awarded, connections] = await Promise.all([
    supabase.from("teams").select(teamSummaryColumns).eq("owner_id", userId).order("created_at", { ascending: false }),
    supabase
      .from("team_applications")
      .select(`id, team_id, role, status, direction, created_at, team:teams(${teamSummaryColumns})`)
      .eq("user_id", userId)
      .order("created_at", { ascending: false }),
    // The decline notification says when an application was declined
    supabase.from("notifications").select("link, created_at").eq("user_id", userId).eq("type", "application_declined"),
    awardedIds(supabase),
    myConnections(supabase, userId, isGuest),
  ]);
  const running = teamSummaries(owned.data, today());
  const mine = ((applications.data ?? []) as unknown as MyApplication[]).filter((a) => a.team);
  const declinedAt = new Map<string, number>();
  for (const n of declines.data ?? []) {
    declinedAt.set(n.link, Math.max(declinedAt.get(n.link) ?? 0, Date.parse(n.created_at)));
  }
  const now = new Date().getTime();
  const day = today();
  const slots = (team: TeamSummary | null) => {
    if (!team) return null;
    const current = withCurrentEvent(team, day);
    return <TeamRowSlots slots={toSlots(team, userId, connections)} closed={recruitingRoles(current, day).length === 0 && openRoles(team).length > 0} />;
  };
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
      <EmptyState icon={Users} action={<ButtonLink href="/teams" variant="secondary" size="sm">Find teams</ButtonLink>}>You&apos;re not on any team yet.</EmptyState>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      {invitations.length > 0 && (
        <section>
          <Heading title="Invitations" count={invitations.length} />
          {invitations.map((a) => (
            <TeamRow
              key={a.id}
              teamId={a.team_id}
              slots={slots(a.team)}
              title={a.team?.title ?? ""}
              action={
                <AnswerButtons
                  accept={answerInvite.bind(null, a.id, "accepted")}
                  decline={answerInvite.bind(null, a.id, "declined")}
                  acceptLabel={`Accept the invitation to ${a.team?.title ?? ""}`}
                  declineLabel={`Decline the invitation to ${a.team?.title ?? ""}`}
                />
              }
            >
              <span className="text-foreground">{a.role}</span> · Invited by {a.team?.owner?.name || "Unnamed"}
            </TeamRow>
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
            <TeamRow key={a.id} teamId={a.team_id} slots={slots(a.team)} title={a.team?.title ?? ""}>
              <span className="text-foreground">{a.role}</span> · Started by {a.team?.owner?.name || "Unnamed"}
            </TeamRow>
          ))}
        </section>
      )}

      {pendingOrDeclined.length > 0 && (
        <section>
          <Heading title="Applications" count={pendingOrDeclined.length} />
          {pendingOrDeclined.map((a) => (
            <TeamRow
              key={a.id}
              teamId={a.team_id}
              slots={slots(a.team)}
              title={a.team?.title ?? ""}
              action={a.status === "pending" && (
                <form action={withdrawApplication.bind(null, a.team_id)}><SubmitButton variant="quiet" size="sm">Withdraw</SubmitButton></form>
              )}
            >
              {a.role} ·{" "}
              {a.status === "pending" ? <span className="font-medium text-accent">Pending</span> : <span className="text-muted">Declined</span>}
            </TeamRow>
          ))}
        </section>
      )}
    </div>
  );
}
