import type { ReactNode } from "react";
import Link from "next/link";
import { SOON_DAYS, daysLabel, daysUntil, nextDate, opportunityTypes, placeLabel, type OpportunityType } from "@/lib/opportunities";
import { goingLabel, type Going } from "@/lib/connections";
import { MonoLabel } from "@/components/ui";

export const columns = "lg:grid lg:grid-cols-opportunity lg:items-center lg:gap-6";

export type OpportunityRowData = {
  id: string; title: string; url: string; type: OpportunityType; organizer: string; location: string; online: boolean;
  starts_at: string | null; deadline: string | null; ends_at: string | null; opportunity_participants: unknown; featured: boolean;
  // supabase/opportunity-engine.sql
  city: string; country: string | null; languages: string[]; eligibility: string; created_at: string;
};

// The column labels above the rows, from lg up
export function OpportunityHeader() {
  return (
    <div className={`hidden border-b border-border py-3 text-xs font-semibold tracking-wide text-muted ${columns}`}>
      <span>TYPE</span>
      <span>OPPORTUNITY</span>
      <span>WHERE</span>
      <span>DEADLINE</span>
      <span>TEAMS</span>
    </div>
  );
}

// One opportunity as a row of the ruled table. The title's link covers the whole row; the "going" link sits above it.
// `day` is today. `going`: your connections going, if any. `actions`: a featured event's buttons, under the row.
export function OpportunityRow({ o, day, going, actions }: { o: OpportunityRowData; day: string; going?: Going; actions?: ReactNode }) {
  const next = nextDate(o, day);
  const looking = (o.opportunity_participants as { count: number }[])[0]?.count ?? 0;
  const days = next.date ? daysUntil(next.date, day) : null;
  const urgent = days !== null && days <= SOON_DAYS;
  const left = days !== null && <span className={`text-meta ${urgent ? "font-semibold text-accent" : "text-muted"}`}>{daysLabel(days)}</span>;
  return (
    <article className={`group relative flex flex-col gap-1 border-b border-border py-4 ${columns}`}>
      <span className="flex items-center justify-between gap-2">
        <MonoLabel>
          {opportunityTypes[o.type]}
          {o.featured && <span className="block text-accent">Featured</span>}
        </MonoLabel>
        <span className="lg:hidden">{urgent && left}</span>
      </span>
      <span className="flex min-w-0 flex-col gap-0.5">
        <Link href={`/opportunities/${o.id}`} className="text-base leading-snug font-semibold group-hover:text-accent after:absolute after:inset-0">{o.title}</Link>
        {/* Phones: organizer, place and date on one line under the title */}
        <span className="text-meta text-ink2 lg:text-sm">
          <span className="lg:hidden">{[o.organizer, placeLabel(o), o.languages.join(", "), next.label].filter(Boolean).join(" · ")}</span>
          <span className="hidden lg:inline">{o.organizer}</span>
        </span>
      </span>
      <span className="hidden flex-col gap-0.5 lg:flex">
        <span className="text-sm">{placeLabel(o) || <span className="text-muted">Not listed</span>}</span>
        {o.languages.length > 0 && <span className="text-meta text-muted">{o.languages.join(", ")}</span>}
      </span>
      <span className="hidden flex-col gap-0.5 lg:flex">
        <span className="text-sm tabular-nums">{next.label}</span>
        {left}
      </span>
      <span className="mt-0.5 flex flex-col items-start gap-0.5 text-meta lg:mt-0 lg:text-sm">
        <span><span className="font-semibold">{looking}</span> <span className="text-ink2">looking for a team</span></span>
        {going && (
          <Link href={`/opportunities/${o.id}#${going.onTeam ? "teams" : "looking"}`} className="relative z-10 font-medium text-accent hover:underline">
            {goingLabel(going.people.size)}
          </Link>
        )}
      </span>
      {actions && <div className="mt-2 lg:col-span-full lg:col-start-2 lg:mt-0">{actions}</div>}
    </article>
  );
}
