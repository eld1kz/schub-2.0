import Link from "next/link";
import { requireUser } from "@/lib/supabase/server";
import { dateRange, formatDay, nextDate, opportunityTypes, placeLabel, today, type OpportunityType } from "@/lib/opportunities";
import { countryName, countryOf } from "@/lib/countries";
import { ONLINE, countryOptions, filtersHref, forYou, forYouLabel, matches, readFilters, sortListings, type Me } from "@/lib/opportunity-filters";
import { reviewImport, setOpportunityStatus } from "@/app/actions";
import { OpportunitySearch } from "./opportunity-search";
import { OpportunityHeader, OpportunityRow, type OpportunityRowData } from "./opportunity-row";
import { connectionsGoing, myConnections } from "@/lib/connections";
import { eventState, myTeams } from "@/lib/teams";
import { EventActions } from "./event-actions";
import { ButtonLink, PageHeader, Tabs, ToastProvider, SubmitButton } from "@/components/ui";
import { OpportunityFilters } from "./opportunity-filters";

export const instant = false;

const types = Object.keys(opportunityTypes) as OpportunityType[];
const tabLabel = (t: OpportunityType) => (t === "other" ? "Other" : `${opportunityTypes[t]}s`);

const sourceNames: Record<string, string> = { hackclub: "Hack Club", kaggle: "Kaggle", kstartup: "K-Startup", luma: "Luma" };

export default async function OpportunitiesPage(props: PageProps<"/opportunities">) {
  const filters = readFilters(await props.searchParams);
  const { type } = filters;
  const { supabase, userId, isGuest } = await requireUser();
  const day = today();

  // Every upcoming one; the type tabs filter here, so each tab can show its count
  const query = supabase
    .from("opportunities")
    // `*` so online and ends_at (supabase/opportunity-details.sql) come along without naming them
    .select("*, opportunity_participants(count)")
    .eq("status", "live")
    // Imports waiting for review are only listed under Review imports (admins can read them)
    .eq("needs_review", false)
    .or(`deadline.gte.${day},starts_at.gte.${day},and(deadline.is.null,starts_at.is.null)`);

  // Your connections going to each one: loaded once for the whole list
  const going = myConnections(supabase, userId, isGuest).then((connections) => connectionsGoing(supabase, connections));
  const [{ data: items }, { data: admin }, goingTo, looking, yourTeams, profile] = await Promise.all([
    query,
    supabase.rpc("is_admin"),
    going,
    // For featured events' buttons: where you're looking for a team, and your teams
    supabase.from("opportunity_participants").select("opportunity_id, note").eq("user_id", userId),
    isGuest ? [] : myTeams(supabase, userId),
    // Where you are and what you speak, for "for you" and "Can I join?"
    supabase.from("profiles").select("city, languages").eq("id", userId).maybeSingle(),
  ]);
  const me: Me | null = isGuest || !profile.data ? null : { country: countryOf(profile.data.city ?? ""), languages: profile.data.languages ?? [] };
  const note = new Map((looking.data ?? []).map((p) => [p.opportunity_id as string, p.note as string]));
  const [{ data: hidden }, { data: pending }] = admin
    ? await Promise.all([
        supabase.from("opportunities").select("id, title, opportunity_reports(reason)").eq("status", "hidden").order("created_at"),
        supabase.from("opportunities").select("id, title, url, source, location, city, country, online, starts_at, ends_at, deadline").eq("status", "live").eq("needs_review", true).order("imported_at"),
      ])
    : [{ data: [] }, { data: [] }];

  const all = ((items ?? []) as OpportunityRowData[]).map((o) => {
    const next = nextDate(o, day);
    return { ...o, next, date: next.date, looking: (o.opportunity_participants as { count: number }[])[0]?.count ?? 0 };
  });
  // Each type tab and country counts what picking it would show, with the other filters as they are
  const count = (t: OpportunityType | null) => all.filter((o) => matches(o, { ...filters, type: t }, me)).length;
  const countries = countryOptions(all, all.filter((o) => matches(o, filters, me, "country")));
  const shown = sortListings(all.filter((o) => matches(o, filters, me)), filters.sort);
  const showingForYou = forYou(filters, me);
  // Signed in, with a country or languages, but asked for everything: offer "for you" back
  const couldBeForYou = !showingForYou && filters.all && forYou({ ...filters, all: false }, me);
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

  // A picked country with no events at all, whatever the other filters say
  const emptyCountry = filters.country && filters.country !== ONLINE && !all.some((o) => o.country === filters.country) ? countryName(filters.country) : "";

  const tab = (t: OpportunityType | null, label: string) => ({ href: filtersHref({ ...filters, type: t }), label, current: type === t, count: count(t) });

  return (
    <ToastProvider>
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Opportunities"
        description="Hackathons, competitions, grants and internships open to students."
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
                <form action={setOpportunityStatus.bind(null, o.id, "live")}><SubmitButton variant="secondary" size="sm">Restore</SubmitButton></form>
                <form action={setOpportunityStatus.bind(null, o.id, "removed")}><SubmitButton size="sm">Remove</SubmitButton></form>
              </div>
            </div>
          ))}
        </section>
      )}

      {admin && (pending ?? []).length > 0 && (
        <section aria-labelledby="review-imports" className="border-y border-line2 py-4">
          <h2 id="review-imports" className="mb-2 text-base font-semibold">Review imports</h2>
          {(pending ?? []).map((o) => (
            <div key={o.id} className="flex flex-col gap-2 border-b border-border py-3 last:border-b-0 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0 text-sm">
                <a href={o.url} target="_blank" rel="noopener noreferrer" className="font-medium hover:text-accent">{o.title}</a>
                <span className="block text-ink2">
                  {[sourceNames[o.source ?? ""] ?? o.source, dateRange(o.starts_at, o.ends_at) || (o.deadline && `Apply by ${formatDay(o.deadline)}`), placeLabel(o) || "Place not known"].filter(Boolean).join(" · ")}
                </span>
              </div>
              <div className="flex shrink-0 gap-2">
                <form action={reviewImport.bind(null, o.id, "approve")}><SubmitButton size="sm">Approve</SubmitButton></form>
                <ButtonLink href={`/opportunities/${o.id}/edit`} variant="secondary" size="sm">Edit</ButtonLink>
                <form action={reviewImport.bind(null, o.id, "reject")}><SubmitButton variant="secondary" size="sm">Reject</SubmitButton></form>
              </div>
            </div>
          ))}
        </section>
      )}

      <Tabs label="Opportunity types" scroll tabs={[tab(null, "All"), ...types.map((t) => tab(t, tabLabel(t)))]} />

      <div className="flex flex-col gap-3">
        <OpportunityFilters filters={filters} countries={countries} />
        {showingForYou && (
          <p className="text-sm text-ink2">
            Showing events for you <span className="text-muted">({forYouLabel(me)})</span> ·{" "}
            <Link href={filtersHref({ ...filters, all: true })} className="font-medium text-accent hover:underline">Show all</Link>
          </p>
        )}
        {couldBeForYou && (
          <p className="text-sm text-ink2">
            Showing all events ·{" "}
            <Link href={filtersHref({ ...filters, all: false })} className="font-medium text-accent hover:underline">Show events for you</Link>
          </p>
        )}
      </div>

      <OpportunitySearch
        empty={
          emptyCountry ? (
            `No events in ${emptyCountry} yet.`
          ) : all.length === 0 ? (
            "No upcoming opportunities yet."
          ) : showingForYou ? (
            "Nothing here for you yet. Show all to see every event."
          ) : type ? (
            `No upcoming ${tabLabel(type).toLowerCase()} match these filters.`
          ) : (
            "No upcoming opportunities match these filters."
          )
        }
        emptyAction={<ButtonLink href="/opportunities/new" variant="secondary" size="sm">Add one</ButtonLink>}
        header={<OpportunityHeader />}
        rows={shown.map((o) => ({ id: o.id, title: o.title, node: <OpportunityRow o={o} day={day} going={goingTo.get(o.id)} actions={actions(o)} /> }))}
      />
    </div>
    </ToastProvider>
  );
}
