import Link from "next/link";
import { requireUser } from "@/lib/supabase/server";
import { SOON_DAYS, daysLabel, daysUntil, nextDate, opportunityTypes, placeLabel, today, type OpportunityType } from "@/lib/opportunities";
import { setOpportunityStatus } from "@/app/actions";
import { OpportunitySearch } from "./opportunity-search";

export const instant = false;

const types = Object.keys(opportunityTypes) as OpportunityType[];
const tabLabel = (t: OpportunityType) => (t === "other" ? "Other" : `${opportunityTypes[t]}s`);
const columns = "lg:grid lg:grid-cols-[120px_minmax(0,1fr)_200px_190px_200px] lg:items-center lg:gap-6";

type Row = { id: string; title: string; type: OpportunityType; organizer: string; location: string; online: boolean; starts_at: string | null; deadline: string | null; ends_at: string | null; opportunity_participants: unknown };

export default async function OpportunitiesPage(props: PageProps<"/opportunities">) {
  const { type: typeParam } = await props.searchParams;
  const type = typeof typeParam === "string" && typeParam in opportunityTypes ? (typeParam as OpportunityType) : null;
  const { supabase } = await requireUser();
  const day = today();

  // Every upcoming one; the type tabs filter here, so each tab can show its count
  const query = supabase
    .from("opportunities")
    // `*` so online and ends_at (supabase/opportunity-details.sql) come along without naming them
    .select("*, opportunity_participants(count)")
    .eq("status", "live")
    .or(`deadline.gte.${day},starts_at.gte.${day},and(deadline.is.null,starts_at.is.null)`);

  const [{ data: items }, { data: admin }] = await Promise.all([query, supabase.rpc("is_admin")]);
  const { data: hidden } = admin
    ? await supabase.from("opportunities").select("id, title, opportunity_reports(reason)").eq("status", "hidden").order("created_at")
    : { data: [] };

  const all = ((items ?? []) as Row[]).map((o) => ({ ...o, next: nextDate(o, day) }));
  const count = (t: OpportunityType | null) => (t ? all.filter((o) => o.type === t).length : all.length);
  // Soonest next date first; ones without a date last
  const shown = all
    .filter((o) => !type || o.type === type)
    .sort((a, b) => (a.next.date ?? "9999").localeCompare(b.next.date ?? "9999"));

  const tab = (t: OpportunityType | null, label: string) => (
    <Link
      key={t ?? "all"}
      href={t ? `/opportunities?type=${t}` : "/opportunities"}
      aria-current={type === t ? "page" : undefined}
      className="shrink-0 py-2.5 whitespace-nowrap hover:text-foreground aria-[current=page]:text-foreground aria-[current=page]:shadow-[inset_0_-2px_0_var(--accent)]"
    >
      {label} <span className="text-muted tabular-nums">{count(t)}</span>
    </Link>
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-end justify-between gap-6">
        <div className="flex flex-col gap-1.5">
          <h1 className="text-[28px] font-semibold tracking-[-0.02em] sm:text-4xl sm:tracking-[-0.03em]">Opportunities</h1>
          <p className="hidden text-base text-ink2 sm:block">Hackathons, competitions, grants and internships open to students. Soonest date first.</p>
        </div>
        <Link href="/opportunities/new" className="btn-outline hidden sm:inline-flex">Add opportunity</Link>
        <Link href="/opportunities/new" className="pb-1.5 text-[15px] font-semibold text-accent sm:hidden">+ Add</Link>
      </div>

      {admin && (hidden ?? []).length > 0 && (
        <section className="border-y border-line2 py-4">
          <h2 className="mb-2 text-[15px] font-semibold">Hidden after reports</h2>
          {(hidden ?? []).map((o) => (
            <div key={o.id} className="flex flex-col gap-2 border-b border-border py-3 last:border-b-0 sm:flex-row sm:items-center sm:justify-between">
              <div className="text-sm">
                <Link href={`/opportunities/${o.id}`} className="font-medium hover:text-accent">{o.title}</Link>
                <span className="text-ink2"> · {(o.opportunity_reports as { reason: string }[]).map((r) => r.reason).join(", ")}</span>
              </div>
              <div className="flex gap-2">
                <form action={setOpportunityStatus.bind(null, o.id, "live")}><button className="btn-outline h-9">Restore</button></form>
                <form action={setOpportunityStatus.bind(null, o.id, "removed")}><button className="btn h-9 px-4">Remove</button></form>
              </div>
            </div>
          ))}
        </section>
      )}

      {/* Underlined type tabs; on phones they scroll sideways in one row */}
      <nav aria-label="Opportunity types" className="-mx-4 flex gap-6 overflow-x-auto border-b border-line2 px-4 text-[15px] font-medium text-ink2 sm:mx-0 sm:gap-7 sm:px-0">
        {tab(null, "All")}
        {types.map((t) => tab(t, tabLabel(t)))}
      </nav>

      <OpportunitySearch
        empty={type ? `No upcoming ${tabLabel(type).toLowerCase()} yet.` : "No upcoming opportunities yet."}
        header={
          <div className={`hidden border-b border-border py-3 text-xs font-semibold tracking-[0.04em] text-muted ${columns}`}>
            <span>TYPE</span>
            <span>OPPORTUNITY</span>
            <span>WHERE</span>
            <span>DEADLINE</span>
            <span>TEAMS</span>
          </div>
        }
        rows={shown.map((o) => {
          const looking = (o.opportunity_participants as { count: number }[])[0]?.count ?? 0;
          const days = o.next.date ? daysUntil(o.next.date, day) : null;
          const urgent = days !== null && days <= SOON_DAYS;
          const left = days !== null && <span className={`text-[13px] ${urgent ? "font-semibold text-accent" : "text-muted"}`}>{daysLabel(days)}</span>;
          return {
            id: o.id,
            title: o.title,
            node: (
              <Link href={`/opportunities/${o.id}`} className={`group flex flex-col gap-1 border-b border-border py-4 lg:py-[18px] ${columns}`}>
                <span className="flex items-center justify-between gap-2">
                  <span className="font-mono text-[11px] font-medium tracking-[0.02em] text-ink2 uppercase lg:text-xs">{opportunityTypes[o.type]}</span>
                  <span className="lg:hidden">{urgent && left}</span>
                </span>
                <span className="flex min-w-0 flex-col gap-0.5">
                  <span className="text-base leading-snug font-semibold group-hover:text-accent">{o.title}</span>
                  {/* Phones: organizer, place and date on one line under the title */}
                  <span className="text-[13px] text-ink2 lg:text-sm">
                    <span className="lg:hidden">{[o.organizer, placeLabel(o), o.next.label].filter(Boolean).join(" · ")}</span>
                    <span className="hidden lg:inline">{o.organizer}</span>
                  </span>
                </span>
                <span className="hidden text-sm lg:block">{placeLabel(o) || <span className="text-muted">Not listed</span>}</span>
                <span className="hidden flex-col gap-0.5 lg:flex">
                  <span className="text-sm tabular-nums">{o.next.label}</span>
                  {left}
                </span>
                <span className="mt-0.5 text-[13px] lg:mt-0 lg:text-sm">
                  <span className="font-semibold">{looking}</span> <span className="text-ink2">looking for a team</span>
                </span>
              </Link>
            ),
          };
        })}
      />
    </div>
  );
}
