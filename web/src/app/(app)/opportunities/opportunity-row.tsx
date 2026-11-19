import Link from "next/link";
import { SOON_DAYS, daysLabel, daysUntil, nextDate, opportunityTypes, placeLabel, type OpportunityType } from "@/lib/opportunities";

export const columns = "lg:grid lg:grid-cols-[120px_minmax(0,1fr)_200px_190px_200px] lg:items-center lg:gap-6";

export type OpportunityRowData = { id: string; title: string; type: OpportunityType; organizer: string; location: string; online: boolean; starts_at: string | null; deadline: string | null; ends_at: string | null; opportunity_participants: unknown };

// The column labels above the rows, from lg up
export function OpportunityHeader() {
  return (
    <div className={`hidden border-b border-border py-3 text-xs font-semibold tracking-[0.04em] text-muted ${columns}`}>
      <span>TYPE</span>
      <span>OPPORTUNITY</span>
      <span>WHERE</span>
      <span>DEADLINE</span>
      <span>TEAMS</span>
    </div>
  );
}

// One opportunity as a row of the ruled table; the whole row links to its page. `day` is today.
export function OpportunityRow({ o, day }: { o: OpportunityRowData; day: string }) {
  const next = nextDate(o, day);
  const looking = (o.opportunity_participants as { count: number }[])[0]?.count ?? 0;
  const days = next.date ? daysUntil(next.date, day) : null;
  const urgent = days !== null && days <= SOON_DAYS;
  const left = days !== null && <span className={`text-[13px] ${urgent ? "font-semibold text-accent" : "text-muted"}`}>{daysLabel(days)}</span>;
  return (
    <Link href={`/opportunities/${o.id}`} className={`group flex flex-col gap-1 border-b border-border py-4 lg:py-[18px] ${columns}`}>
      <span className="flex items-center justify-between gap-2">
        <span className="font-mono text-[11px] font-medium tracking-[0.02em] text-ink2 uppercase lg:text-xs">{opportunityTypes[o.type]}</span>
        <span className="lg:hidden">{urgent && left}</span>
      </span>
      <span className="flex min-w-0 flex-col gap-0.5">
        <span className="text-base leading-snug font-semibold group-hover:text-accent">{o.title}</span>
        {/* Phones: organizer, place and date on one line under the title */}
        <span className="text-[13px] text-ink2 lg:text-sm">
          <span className="lg:hidden">{[o.organizer, placeLabel(o), next.label].filter(Boolean).join(" · ")}</span>
          <span className="hidden lg:inline">{o.organizer}</span>
        </span>
      </span>
      <span className="hidden text-sm lg:block">{placeLabel(o) || <span className="text-muted">Not listed</span>}</span>
      <span className="hidden flex-col gap-0.5 lg:flex">
        <span className="text-sm tabular-nums">{next.label}</span>
        {left}
      </span>
      <span className="mt-0.5 text-[13px] lg:mt-0 lg:text-sm">
        <span className="font-semibold">{looking}</span> <span className="text-ink2">looking for a team</span>
      </span>
    </Link>
  );
}
