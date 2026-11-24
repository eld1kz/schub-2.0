import Link from "next/link";
import { requireUser } from "@/lib/supabase/server";
import { nextDate, opportunityTypes, today, type OpportunityType } from "@/lib/opportunities";
import { setOpportunityStatus } from "@/app/actions";
import { OpportunitySearch } from "./opportunity-search";
import { OpportunityHeader, OpportunityRow, type OpportunityRowData } from "./opportunity-row";
import { connectionsGoing, myConnections } from "@/lib/connections";
import { eventState, myTeams } from "@/lib/teams";
import { ToastProvider } from "../u/[id]/toast";
import { EventActions } from "./event-actions";
import { ButtonLink, PageHeader, Tabs, buttonClass } from "@/components/ui";

export const instant = false;

const types = Object.keys(opportunityTypes) as OpportunityType[];
const tabLabel = (t: OpportunityType) => (t === "other" ? "Other" : `${opportunityTypes[t]}s`);

export default async function OpportunitiesPage(props: PageProps<"/opportunities">) {
  const { type: typeParam } = await props.searchParams;
  const type = typeof typeParam === "string" && typeParam in opportunityTypes ? (typeParam as OpportunityType) : null;
  const { supabase, userId, isGuest } = await requireUser();
  const day = today();

  // Every upcoming one; the type tabs filter here, so each tab can show its count
  const query = supabase
    .from("opportunities")
    // `*` so online and ends_at (supabase/opportunity-details.sql) come along without naming them
    .select("*, opportunity_participants(count)")
    .eq("status", "live")
    .or(`deadline.gte.${day},starts_at.gte.${day},and(deadline.is.null,starts_at.is.null)`);

  // Your connections going to each one: loaded once for the whole list
  const going = myConnections(supabase, userId, isGuest).then((connections) => connectionsGoing(supabase, connections));
  const [{ data: items }, { data: admin }, goingTo, looking, yourTeams] = await Promise.all([
    query,
    supabase.rpc("is_admin"),
    going,
    // For featured events' buttons: where you're looking for a team, and your teams
    supabase.from("opportunity_participants").select("opportunity_id, note").eq("user_id", userId),
    isGuest ? [] : myTeams(supabase, userId),
  ]);
  const note = new Map((looking.data ?? []).map((p) => [p.opportunity_id as string, p.note as string]));
  const { data: hidden } = admin
    ? await supabase.from("opportunities").select("id, title, opportunity_reports(reason)").eq("status", "hidden").order("created_at")
    : { data: [] };

  const all = ((items ?? []) as OpportunityRowData[]).map((o) => ({ ...o, next: nextDate(o, day) }));
  const count = (t: OpportunityType | null) => (t ? all.filter((o) => o.type === t).length : all.length);
  // Featured first, then soonest next date first; ones without a date last
  const shown = all
    .filter((o) => !type || o.type === type)
    .sort((a, b) => Number(b.featured) - Number(a.featured) || (a.next.date ?? "9999").localeCompare(b.next.date ?? "9999"));
  // A featured event's buttons, as on its own page
  const actions = (o: (typeof all)[number]) => {
    if (!o.featured) return undefined;
    const { entered, enterable } = eventState(yourTeams, o.id);
    const mine = note.get(o.id);
    return (
      <EventActions
        event={{ id: o.id, title: o.title, url: o.url }}
        userId={userId}
        isGuest={isGuest}
        looking={mine === undefined ? null : { note: mine }}
        entered={entered}
        enterable={enterable}
        ended={false}
        compact
      />
    );
  };

  const tab = (t: OpportunityType | null, label: string) => ({ href: t ? `/opportunities?type=${t}` : "/opportunities", label, current: type === t, count: count(t) });

  return (
    <ToastProvider>
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Opportunities"
        description="Hackathons, competitions, grants and internships open to students. Soonest date first."
        quietOnPhones
        action={
          <>
            <ButtonLink href="/opportunities/new" variant="secondary" showFrom="sm">Add opportunity</ButtonLink>
            <Link href="/opportunities/new" className="pb-1.5 text-base font-semibold text-accent sm:hidden">+ Add</Link>
          </>
        }
      />

      {admin && (hidden ?? []).length > 0 && (
        <section className="border-y border-line2 py-4">
          <h2 className="mb-2 text-base font-semibold">Hidden after reports</h2>
          {(hidden ?? []).map((o) => (
            <div key={o.id} className="flex flex-col gap-2 border-b border-border py-3 last:border-b-0 sm:flex-row sm:items-center sm:justify-between">
              <div className="text-sm">
                <Link href={`/opportunities/${o.id}`} className="font-medium hover:text-accent">{o.title}</Link>
                <span className="text-ink2"> · {(o.opportunity_reports as { reason: string }[]).map((r) => r.reason).join(", ")}</span>
              </div>
              <div className="flex gap-2">
                <form action={setOpportunityStatus.bind(null, o.id, "live")}><button className={buttonClass({ variant: "secondary", size: "sm" })}>Restore</button></form>
                <form action={setOpportunityStatus.bind(null, o.id, "removed")}><button className={buttonClass({ size: "sm" })}>Remove</button></form>
              </div>
            </div>
          ))}
        </section>
      )}

      <Tabs label="Opportunity types" scroll tabs={[tab(null, "All"), ...types.map((t) => tab(t, tabLabel(t)))]} />

      <OpportunitySearch
        empty={type ? `No upcoming ${tabLabel(type).toLowerCase()} yet.` : "No upcoming opportunities yet."}
        header={<OpportunityHeader />}
        rows={shown.map((o) => ({ id: o.id, title: o.title, node: <OpportunityRow o={o} day={day} going={goingTo.get(o.id)} actions={actions(o)} /> }))}
      />
    </div>
    </ToastProvider>
  );
}
