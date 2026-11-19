import type { ReactNode } from "react";
import Link from "next/link";
import { answerAwardTag } from "@/app/actions";
import { confirmedTeammates, formedOnSchub, placementLabel, type Award, type AwardPerson } from "@/lib/awards";
import { formatMonth, webLink } from "@/lib/portfolio";
import { Avatar } from "../../avatar";
import type { AwardOptions } from "./award-fields";
import { EmptyPrompt, Section } from "./profile-parts";
import { RemoveMeButton } from "./remove-me-button";
import { AwardEdit } from "./section-edits";

const outLink = "font-medium text-accent hover:underline";

// "1ST PLACE", in mono caps and the accent color
export function Placement({ placement, className = "" }: { placement: string; className?: string }) {
  return <span className={`font-mono text-xs font-medium tracking-[0.04em] text-accent uppercase ${className}`}>{placementLabel(placement)}</span>;
}

// The event's name, linked when it's a Schub opportunity
export function EventName({ award: a }: { award: Award }) {
  return a.opportunity ? <Link href={`/opportunities/${a.opportunity.id}`} className="hover:text-accent">{a.opportunity.title}</Link> : <>{a.event_name}</>;
}

// "Confirmed by teammates · Team formed on Schub", or nothing
export function TrustLabels({ award: a, className = "" }: { award: Award; className?: string }) {
  const labels = [confirmedTeammates(a).length > 0 && "Confirmed by teammates", formedOnSchub(a) && "Team formed on Schub"].filter(Boolean);
  if (labels.length === 0) return null;
  return (
    <p className={`flex flex-wrap gap-x-4 gap-y-1 text-[13px] text-muted ${className}`}>
      {labels.map((l) => (
        <span key={String(l)} className="flex items-center gap-1.5">
          <svg viewBox="0 0 16 16" aria-hidden className="h-3 w-3 fill-none stroke-current" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <path d="m3 8.5 3 3 7-7" />
          </svg>
          {l}
        </span>
      ))}
    </p>
  );
}

// The owner and everyone who confirmed, leaving out `except`
export function awardPeople(a: Award, except?: string) {
  const everyone = [a.owner, ...confirmedTeammates(a).map((t) => t.person)].filter((p): p is AwardPerson => p !== null);
  return everyone.filter((p) => p.id !== except);
}

function PeopleStack({ people }: { people: AwardPerson[] }) {
  return (
    <ul className="flex">
      {people.map((p) => (
        <li key={p.id} className="-mr-1.5">
          <Link href={`/u/${p.id}`} title={p.name || "Unnamed"} className="block rounded-full border-2 border-background hover:opacity-80">
            <Avatar url={p.avatar_url} name={p.name} className="h-7 w-7 text-[10px]" sizes="28px" />
          </Link>
        </li>
      ))}
    </ul>
  );
}

// One award on the profile of `profileId`: their own, or one they confirmed as a teammate ("with Hana")
export function AwardItem({ award: a, profileId, edit, waiting }: { award: Award; profileId: string; edit?: ReactNode; waiting: number }) {
  const byTeammate = a.user_id !== profileId;
  const others = awardPeople(a, profileId);
  const proof = webLink(a.proof_url);
  return (
    <article id={`award-${a.id}`} className="flex flex-col gap-1 border-b border-border pb-5 sm:pb-6 [&+&]:pt-5 sm:[&+&]:pt-6">
      <div className="flex items-start justify-between gap-4">
        <Placement placement={a.placement} className="pt-0.5" />
        {edit && <span className="-my-2">{edit}</span>}
      </div>
      <h3 className="text-[15px] font-semibold sm:text-[17px]"><EventName award={a} /></h3>
      <p className="text-[13px] text-ink2 sm:text-sm">
        {[a.prize_name, formatMonth(a.awarded_on)].filter(Boolean).join(" · ")}
        {byTeammate && (
          <>
            {" · with "}
            <Link href={`/u/${a.user_id}`} className="font-medium text-foreground hover:text-accent">{a.owner?.name || "Unnamed"}</Link>
          </>
        )}
      </p>
      {a.description && <p className="mt-1 max-w-[600px] text-sm leading-normal whitespace-pre-wrap sm:text-[15px]">{a.description}</p>}
      {(others.length > 0 || a.project || proof) && (
        <div className="mt-2 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
          {others.length > 0 && <PeopleStack people={others} />}
          {a.project && (
            <span>
              <span className="text-muted">Project </span>
              <Link href={`/u/${a.user_id}#project-${a.project.id}`} className={outLink}>{a.project.title}</Link>
            </span>
          )}
          {proof && <a href={proof} target="_blank" rel="noreferrer" className={outLink}>Proof ↗</a>}
        </div>
      )}
      <TrustLabels award={a} className="mt-1" />
      {waiting > 0 && <p className="text-[13px] text-muted">Waiting for {waiting} {waiting === 1 ? "teammate" : "teammates"} to confirm. Only you see this.</p>}
    </article>
  );
}

// The Awards section: your own awards and the ones you confirmed as a teammate, newest first
export function AwardsSection({ awards, profileId, canEdit, options }: { awards: Award[]; profileId: string; canEdit: boolean; options: AwardOptions }) {
  if (awards.length === 0 && !canEdit) return null;
  return (
    <Section id="awards" title="Awards" count={awards.length || undefined} quiet={awards.length === 0} owner={canEdit} add={canEdit && awards.length > 0 && <AwardEdit options={options} trigger="link" />}>
      {awards.length > 0 ? (
        <div className="flex flex-col">
          {awards.map((a) => {
            const own = a.user_id === profileId;
            const edit = canEdit && (own ? <AwardEdit award={a} options={options} trigger="edit" /> : <RemoveMeButton action={answerAwardTag.bind(null, a.id, "declined")} />);
            const waiting = canEdit && own ? a.award_teammates.filter((t) => t.status === "pending").length : 0;
            return <AwardItem key={a.id} award={a} profileId={profileId} edit={edit} waiting={waiting} />;
          })}
        </div>
      ) : (
        <EmptyPrompt title="Add an award" text="Hackathon wins, finals, track prizes. Link the event and tag your teammates so they can confirm it.">
          <AwardEdit options={options} trigger="button" />
        </EmptyPrompt>
      )}
    </Section>
  );
}

// At the top of your own profile: awards you were tagged in that wait for your answer
export function PendingTags({ awards }: { awards: Award[] }) {
  return (
    <section aria-label="Awards to confirm" className="mb-8 flex flex-col border-b border-line2 sm:mb-12">
      {awards.map((a) => (
        <div key={a.id} className="flex flex-col gap-3 border-t border-border py-4 first:border-t-0 first:pt-0 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
          <p className="text-[15px] leading-normal">
            <Link href={`/u/${a.user_id}`} className="font-semibold hover:text-accent">{a.owner?.name || "Someone"}</Link> tagged you in{" "}
            <span className="font-semibold">{placementLabel(a.placement)}</span>, <EventName award={a} />.
          </p>
          <div className="flex shrink-0 gap-2">
            <form action={answerAwardTag.bind(null, a.id, "confirmed")}><button className="btn h-9 px-4">Confirm</button></form>
            <form action={answerAwardTag.bind(null, a.id, "declined")}><button className="btn-outline h-9">Decline</button></form>
          </div>
        </div>
      ))}
    </section>
  );
}

// One line under the headline: the best award
export function HeroAward({ award: a }: { award: Award }) {
  return (
    <a href="#awards" className="flex w-fit flex-wrap items-baseline gap-x-2.5 gap-y-1 text-sm hover:opacity-80 sm:text-[15px]">
      <Placement placement={a.placement} />
      <span className="font-medium">{a.opportunity?.title ?? a.event_name}</span>
      <span className="text-muted tabular-nums">{formatMonth(a.awarded_on)}</span>
    </a>
  );
}
