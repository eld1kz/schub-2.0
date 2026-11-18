import type { ReactNode } from "react";
import Link from "next/link";
import { matchScore, type MatchableProfile } from "@/lib/match";
import { knownSkills } from "@/lib/skills";
import { SOON_DAYS, dateRange, daysLabel, daysUntil, formatDay, opportunityTypes, placeLabel, type OpportunityType } from "@/lib/opportunities";
import { deleteOpportunity, reportOpportunity } from "@/app/actions";
import type { TeamSummary } from "@/lib/teams";
import { ConnectButton } from "../../connect-button";
import { SignInButton } from "../../sign-in";
import { TeamList } from "../../team-list";
import { PersonRow } from "../../people/person-row";
import { ToastProvider } from "../../u/[id]/toast";
import { LookingPanel } from "./looking-panel";

export type Opportunity = {
  id: string;
  title: string;
  type: OpportunityType;
  organizer: string;
  location: string;
  online: boolean;
  url: string;
  starts_at: string | null;
  deadline: string | null;
  ends_at: string | null;
  description: string;
  status: string;
  submitted_by: string;
};

export type Participant = {
  user_id: string;
  note: string;
  person: { name: string; headline: string; avatar_url: string } & MatchableProfile;
};

type Props = {
  o: Opportunity;
  participants: Participant[];
  me: MatchableProfile;
  statusWith: Record<string, string>;
  myReport: string | null;
  canDelete: boolean;
  teams: TeamSummary[];
  userId: string;
  isGuest: boolean;
  today: string;
};

function SectionHeader({ title, count, action }: { title: string; count?: number; action?: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-line2 pb-3">
      <h2 className="text-lg font-semibold">
        {title}
        {count !== undefined && <span className="ml-1.5 font-normal text-muted">{count}</span>}
      </h2>
      {action}
    </div>
  );
}

// People come here to find teammates, so that comes first; the official page has the details
export function OpportunityView({ o, participants, me, statusWith, myReport, canDelete, teams, userId, isGuest, today }: Props) {
  const mine = participants.find((p) => p.user_id === userId);
  const others = participants
    .filter((p) => p.user_id !== userId)
    .map((p) => ({ ...p, score: matchScore(p.person, me).score }))
    .sort((a, b) => b.score - a.score);
  const place = placeLabel(o);
  const dates = dateRange(o.starts_at, o.ends_at);
  const deadlineDays = o.deadline && o.deadline >= today ? daysUntil(o.deadline, today) : null;
  const canReport = o.submitted_by !== userId && !isGuest;

  return (
    <ToastProvider>
      <header className="flex flex-col gap-6 pb-8 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex min-w-0 flex-col gap-2">
          <span className="font-mono text-xs font-medium tracking-[0.04em] text-ink2 uppercase">{opportunityTypes[o.type]}</span>
          <h1 className="text-[28px] leading-[1.1] font-semibold tracking-[-0.02em] text-balance sm:text-[40px] sm:tracking-[-0.03em]">{o.title}</h1>
          {o.organizer && <p className="text-[17px] text-ink2">{o.organizer}</p>}
          <p className="mt-1 flex flex-wrap gap-x-5 gap-y-1 text-[15px]">
            {place && <span>{place}</span>}
            {dates && <span className="tabular-nums">{dates}</span>}
            {o.deadline && (
              <span className="tabular-nums">
                Apply by {formatDay(o.deadline)}
                {deadlineDays === null ? (
                  <span className="text-muted"> · closed</span>
                ) : (
                  <span className={deadlineDays <= SOON_DAYS ? "font-semibold text-accent" : "text-muted"}> · {daysLabel(deadlineDays)}</span>
                )}
              </span>
            )}
          </p>
          {o.status !== "live" && <p className="font-mono text-xs text-muted uppercase">{o.status}</p>}
        </div>
        <a href={o.url} target="_blank" rel="noreferrer" className="btn-outline shrink-0">Official page ↗</a>
      </header>

      {/* The main action */}
      <section className="rounded-lg border border-accent bg-accent-soft p-5 sm:p-6">
        {isGuest ? (
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-col gap-1">
              <h2 className="text-lg font-semibold">Looking for a team for this?</h2>
              <p className="text-[15px] text-ink2">Sign in to add yourself so teams can find you.</p>
            </div>
            <SignInButton label="Sign in to join" />
          </div>
        ) : (
          <LookingPanel opportunityId={o.id} mine={mine && { note: mine.note }} />
        )}
      </section>

      <section className="mt-12">
        <SectionHeader
          title="Teams recruiting"
          count={teams.length}
          action={<Link href={`/teams/new?opportunity=${o.id}`} className="btn-outline h-9 shrink-0">Post a team for this</Link>}
        />
        <TeamList teams={teams} userId={userId} empty="No teams yet. Already have one? Post it and list the roles you need." />
      </section>

      <section className="mt-12">
        <SectionHeader title="Looking for a team" count={others.length} />
        {others.length === 0 ? (
          <p className="py-8 text-sm text-ink2">{mine ? "Nobody else yet. You're the first." : "Nobody yet. Be the first."}</p>
        ) : (
          <div className="flex flex-col pt-5">
            {others.map((p) => (
              <PersonRow
                key={p.user_id}
                id={p.user_id}
                name={p.person.name}
                headline={p.person.headline}
                avatarUrl={p.person.avatar_url}
                actions={
                  <>
                    <span className="text-[13px] text-muted tabular-nums">{p.score}% match</span>
                    <ConnectButton profileId={p.user_id} status={statusWith[p.user_id]} isGuest={isGuest} className="btn-outline h-9" />
                  </>
                }
              >
                {p.note && <p className="mt-1 max-w-[560px] text-[15px] leading-normal">&ldquo;{p.note}&rdquo;</p>}
                {knownSkills(p.person.skills).length > 0 && (
                  <ul className="mt-1.5 flex flex-wrap gap-1.5">
                    {knownSkills(p.person.skills).slice(0, 4).map((s) => <li key={s} className="skill px-1.5 text-xs">{s}</li>)}
                  </ul>
                )}
              </PersonRow>
            ))}
          </div>
        )}
      </section>

      {o.description && (
        <section className="mt-12">
          <SectionHeader title="About" />
          <p className="max-w-[680px] pt-5 text-[15px] leading-relaxed whitespace-pre-wrap sm:text-base">{o.description}</p>
          <a href={o.url} target="_blank" rel="noreferrer" className="mt-3 inline-block text-sm font-semibold text-accent hover:underline">Full details on the official page ↗</a>
        </section>
      )}

      {(canReport || canDelete) && (
      <footer className="mt-12 flex flex-wrap items-start gap-x-6 gap-y-3 border-t border-line2 pt-5 text-sm text-ink2">
        {canReport &&
          (myReport ? (
            <p>You reported this as {myReport}.</p>
          ) : (
            <details className="group">
              <summary className="cursor-pointer list-none hover:text-foreground [&::-webkit-details-marker]:hidden">Report this listing</summary>
              <form action={reportOpportunity.bind(null, o.id)} className="mt-3 flex flex-wrap items-center gap-2">
                <span className="relative">
                  <select name="reason" aria-label="What's wrong" className="input h-9 cursor-pointer appearance-none py-0 pr-9 text-sm">
                    <option value="fake">Fake or spam</option>
                    <option value="duplicate">Duplicate</option>
                    <option value="expired">Expired</option>
                    <option value="other">Other</option>
                  </select>
                  <svg viewBox="0 0 16 16" aria-hidden className="pointer-events-none absolute top-1/2 right-3 h-4 w-4 -translate-y-1/2 fill-none stroke-muted" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
                    <path d="m4 6 4 4 4-4" />
                  </svg>
                </span>
                <button className="btn-outline h-9">Report</button>
              </form>
            </details>
          ))}
        {canDelete && (
          <form action={deleteOpportunity.bind(null, o.id)}>
            <button className="hover:text-red-600 dark:hover:text-red-400">Delete this listing</button>
          </form>
        )}
      </footer>
      )}
    </ToastProvider>
  );
}
