import type { ReactNode } from "react";
import Link from "next/link";
import { matchScore, type MatchableProfile } from "@/lib/match";
import { knownSkills } from "@/lib/skills";
import { ELIGIBILITY, SOON_DAYS, dateRange, daysLabel, daysUntil, formatDay, isEligibility, opportunityTypes, placeLabel, type OpportunityType } from "@/lib/opportunities";
import { countryName } from "@/lib/countries";
import { deleteOpportunity, reportOpportunity, setFeatured } from "@/app/actions";
import { teamMembers, type EnterableTeam, type MyEntry, type TeamSummary } from "@/lib/teams";
import { goingLabel, tallyGoing } from "@/lib/connections";
import type { Award } from "@/lib/awards";
import { formatMonth } from "@/lib/portfolio";
import { ConnectButton } from "../../connect-button";
import { TeamList } from "../../team-list";
import { PersonRow } from "../../people/person-row";
import { ToastProvider } from "../../u/[id]/toast";
import { Placement, TrustLabels, awardPeople } from "../../u/[id]/awards";
import { EventActions } from "../event-actions";
import { Avatar, ButtonAnchor, Chip, ChipList, Combobox, EmptyState, MonoLabel, PageHeader, buttonClass } from "@/components/ui";

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
  submitted_by: string | null;
  // Shown first on /opportunities and the landing page; only admins change it (supabase/team-entries.sql)
  featured: boolean;
  // supabase/opportunity-engine.sql
  city: string;
  country: string | null;
  languages: string[];
  eligibility: string;
  eligibility_note: string;
  needs_review: boolean;
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
  // Your accepted connections; empty when signed out
  connections: Set<string>;
  myReport: string | null;
  canDelete: boolean;
  isAdmin: boolean;
  // Teams entered in it, without the ones still only "going" once it's over
  teams: TeamSummary[];
  // Your team in it, and your teams that could still enter
  myEntry: MyEntry | null;
  enterable: EnterableTeam[];
  // The event is over (lib/opportunities.ts hasEnded)
  over: boolean;
  // Awards linked to this event, best first; null until the event is over
  placed: Award[] | null;
  // People with any award, for the marker next to their name
  awarded: Set<string>;
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

// One placing team: the placement in the label column, then the people, prize, project and month
function PlacedAward({ award: a }: { award: Award }) {
  const details = [a.prize_name, formatMonth(a.awarded_on)].filter(Boolean).join(" · ");
  return (
    <article className="flex flex-col gap-2 border-b border-border py-4 first:pt-0 sm:grid sm:grid-cols-label sm:gap-6">
      <Placement placement={a.placement} className="sm:pt-1" />
      <div className="flex min-w-0 flex-col gap-1.5">
        <ul className="flex flex-wrap gap-x-4 gap-y-2">
          {awardPeople(a).map((p) => (
            <li key={p.id}>
              <Link href={`/u/${p.id}`} className="flex items-center gap-2 text-base font-medium hover:text-accent">
                <Avatar url={p.avatar_url} name={p.name} size="xs" />
                {p.name || "Unnamed"}
              </Link>
            </li>
          ))}
        </ul>
        <p className="text-sm text-ink2">
          {details}
          {a.project && (
            <>
              {" · "}
              <Link href={`/u/${a.user_id}#project-${a.project.id}`} className="font-medium text-accent hover:underline">{a.project.title}</Link>
            </>
          )}
        </p>
        <TrustLabels award={a} />
      </div>
    </article>
  );
}

const reportReasons = [
  { value: "fake", label: "Fake or spam" },
  { value: "duplicate", label: "Duplicate" },
  { value: "expired", label: "Expired" },
  { value: "other", label: "Other" },
];

// People come here to find teammates, so that comes first; the official page has the details
export function OpportunityView({ o, participants, me, statusWith, connections, myReport, canDelete, isAdmin, teams, myEntry, enterable, over, placed, awarded, userId, isGuest, today }: Props) {
  const mine = participants.find((p) => p.user_id === userId);
  const others = participants
    .filter((p) => p.user_id !== userId)
    .map((p) => ({ ...p, score: matchScore(p.person, me).score }))
    // Your connections first, then the best match
    .sort((a, b) => Number(connections.has(b.user_id)) - Number(connections.has(a.user_id)) || b.score - a.score);
  // Your connections looking for a team here or on a team for it
  const going = tallyGoing(
    participants.map((p) => ({ opportunity_id: o.id, user_id: p.user_id })),
    teams.flatMap((t) => teamMembers(t).map((m) => ({ opportunity_id: o.id, user_id: m.id }))),
    connections,
  ).get(o.id);
  const place = placeLabel(o);
  const dates = dateRange(o.starts_at, o.ends_at);
  const deadlineDays = o.deadline && o.deadline >= today ? daysUntil(o.deadline, today) : null;
  const canReport = o.submitted_by !== userId && !isGuest;

  return (
    <ToastProvider>
      <PageHeader
        title={o.title}
        stack
        className="pb-8"
        eyebrow={
          <MonoLabel>
            {opportunityTypes[o.type]}
            {o.featured && <span className="text-accent"> · Featured</span>}
          </MonoLabel>
        }
        action={<ButtonAnchor href={o.url} variant="secondary">Official page ↗</ButtonAnchor>}
      >
        {o.organizer && <p className="text-lg text-ink2">{o.organizer}</p>}
        <p className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-base">
          {place && <span>{place}</span>}
          {o.languages.length > 0 && <span>{o.languages.join(", ")}</span>}
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
        {going && (
          <a href={going.onTeam ? "#teams" : "#looking"} className="mt-1 w-fit text-base font-medium text-accent hover:underline">
            {goingLabel(going.people.size)}
          </a>
        )}
        {isEligibility(o.eligibility) && o.eligibility !== "anyone" && (
          <p className="text-sm text-ink2">
            Who can join: {o.eligibility === "country" ? `only people in ${countryName(o.country)}` : ELIGIBILITY[o.eligibility]}
            {o.eligibility_note && <span className="text-muted"> · {o.eligibility_note}</span>}
          </p>
        )}
        {o.status !== "live" && <p className="font-mono text-xs text-muted uppercase">{o.status}</p>}
        {o.status === "live" && o.needs_review && <p className="font-mono text-xs text-muted uppercase">Imported, waiting for review</p>}
      </PageHeader>

      {/* The main actions: find a team, create one, or enter yours */}
      <EventActions
        event={{ id: o.id, title: o.title, url: o.url }}
        userId={userId}
        isGuest={isGuest}
        looking={mine ? { note: mine.note } : null}
        entered={myEntry}
        enterable={enterable}
        ended={over}
      />

      {placed && (
        <section className="mt-12">
          <SectionHeader title="Schub teams that placed" count={placed.length} />
          {placed.length === 0 ? (
            <EmptyState>No results added yet. Placed here? Add it to the Awards section of your profile.</EmptyState>
          ) : (
            <div className="flex flex-col pt-4">
              {placed.map((a) => <PlacedAward key={a.id} award={a} />)}
            </div>
          )}
        </section>
      )}

      <section id="teams" className="mt-12 scroll-mt-6">
        <SectionHeader title={over ? "Teams" : "Teams recruiting"} count={teams.length} />
        <TeamList
          teams={teams}
          userId={userId}
          awarded={awarded}
          connections={connections}
          event={o.id}
          empty={over ? "No teams got further than saying they were going." : "No teams yet. Have one? Enter it above, or create one and list the roles you need."}
        />
      </section>

      <section id="looking" className="mt-12 scroll-mt-6">
        <SectionHeader title="Looking for a team" count={others.length} />
        {others.length === 0 ? (
          <EmptyState>{mine ? "Nobody else yet. You're the first." : "Nobody yet. Be the first."}</EmptyState>
        ) : (
          <div className="flex flex-col pt-4">
            {others.map((p) => (
              <PersonRow
                key={p.user_id}
                id={p.user_id}
                name={p.person.name}
                headline={p.person.headline}
                avatarUrl={p.person.avatar_url}
                awarded={awarded.has(p.user_id)}
                open={p.person.open_to_collaborate}
                actions={
                  <>
                    <span className="text-meta text-muted tabular-nums">{p.score}% match</span>
                    <ConnectButton profileId={p.user_id} status={statusWith[p.user_id]} isGuest={isGuest} className={buttonClass({ variant: "secondary", size: "sm" })} />
                  </>
                }
              >
                {connections.has(p.user_id) && <p className="text-meta font-medium text-accent">Your connection</p>}
                {p.note && <p className="mt-1 max-w-form text-base leading-normal">&ldquo;{p.note}&rdquo;</p>}
                {knownSkills(p.person.skills).length > 0 && (
                  <ChipList className="mt-1.5">
                    {knownSkills(p.person.skills).slice(0, 4).map((s) => <Chip key={s}>{s}</Chip>)}
                  </ChipList>
                )}
              </PersonRow>
            ))}
          </div>
        )}
      </section>

      {o.description && (
        <section className="mt-12">
          <SectionHeader title="About" />
          <p className="max-w-dialog pt-4 text-base leading-relaxed whitespace-pre-wrap">{o.description}</p>
          <a href={o.url} target="_blank" rel="noreferrer" className="mt-3 inline-block text-sm font-semibold text-accent hover:underline">Full details on the official page ↗</a>
        </section>
      )}

      {(canReport || canDelete || isAdmin) && (
      <footer className="mt-12 flex flex-wrap items-start gap-x-6 gap-y-3 border-t border-line2 pt-4 text-sm text-ink2">
        {canReport &&
          (myReport ? (
            <p>You reported this as {myReport}.</p>
          ) : (
            <details className="group">
              <summary className="cursor-pointer list-none hover:text-foreground [&::-webkit-details-marker]:hidden">Report this listing</summary>
              <form action={reportOpportunity.bind(null, o.id)} className="mt-3 flex flex-wrap items-center gap-2">
                <Combobox name="reason" label="What's wrong" small options={reportReasons} />
                <button className={buttonClass({ variant: "secondary", size: "sm" })}>Report</button>
              </form>
            </details>
          ))}
        {isAdmin && (
          <form action={setFeatured.bind(null, o.id, !o.featured)}>
            <button className="hover:text-foreground">{o.featured ? "Stop featuring" : "Feature this event"}</button>
          </form>
        )}
        {canDelete && (
          <form action={deleteOpportunity.bind(null, o.id)}>
            <button className="hover:text-danger">Delete this listing</button>
          </form>
        )}
      </footer>
      )}
    </ToastProvider>
  );
}
