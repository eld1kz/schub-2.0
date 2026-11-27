import Link from "next/link";
import { requireUser } from "@/lib/supabase/server";
import { nextDate, opportunityTypes, today, type OpportunityType } from "@/lib/opportunities";
import { countryName, countryOf } from "@/lib/countries";
import { ONLINE, countryOptions, filtersHref, forYou, forYouLabel, matches, readFilters, sortListings, type Me } from "@/lib/opportunity-filters";
import { OpportunitySearch } from "./opportunity-search";
import { OpportunityHeader, OpportunityRow, type OpportunityRowData } from "./opportunity-row";
import { connectionsGoing, myConnections } from "@/lib/connections";
import { eventState, myTeams } from "@/lib/teams";
import { EventActions } from "./event-actions";
import { ButtonLink, PageHeader, Tabs, ToastProvider } from "@/components/ui";
import { OpportunityFilters } from "./opportunity-filters";

export const instant = false;

const types = Object.keys(opportunityTypes) as OpportunityType[];
const tabLabel = (t: OpportunityType) => (t === "other" ? "Other" : `${opportunityTypes[t]}s`);

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
  const [{ data: items }, goingTo, looking, yourTeams, profile] = await Promise.all([
    query,
    going,
    // For featured events' buttons: where you're looking for a team, and your teams
    supabase.from("opportunity_participants").select("opportunity_id, note").eq("user_id", userId),
    isGuest ? [] : myTeams(supabase, userId),
    // Where you are and what you speak, for "for you" and "Can I join?"
    supabase.from("profiles").select("city, languages").eq("id", userId).maybeSingle(),
  ]);
  const me: Me | null = isGuest || !profile.data ? null : { country: countryOf(profile.data.city ?? ""), languages: profile.data.languages ?? [] };
  const note = new Map((looking.data ?? []).map((p) => [p.opportunity_id as string, p.note as string]));

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
