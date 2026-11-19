import type { ReactNode } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/supabase/server";
import { daysLabel, daysUntil, nextDate, today } from "@/lib/opportunities";
import { openRoles, teamSummaryColumns, type TeamSummary } from "@/lib/teams";
import { awardedIds } from "@/lib/awards";
import { OpportunityHeader, OpportunityRow, type OpportunityRowData } from "./(app)/opportunities/opportunity-row";
import { TeamList } from "./(app)/team-list";
import { EmptyPrompt } from "./(app)/u/[id]/profile-parts";
import { BuildingPreview, ConfirmedMark, EventMark, HeroPreview, LookingPreview, MatchMark } from "./landing-samples";
import { PublicHeader } from "./public-header";
import { SignInOptions } from "./sign-in-options";

// Signed-out visitors get the landing page; members go straight to opportunities
export const instant = false;

// Short answers that hold for everyone: contact details follow contact_for (team-contact.sql), awards follow awards.sql
const faq = [
  ["Is it free?", "Yes. Browsing, posting teams and asking to join them are all free."],
  ["Who can join?", "Students building for hackathons, competitions and their own projects. Anyone can browse without an account; to post or join a team, sign in and add your university and skills."],
  ["Who sees my contact info?", "Your connections and your teammates."],
  ["How do awards get confirmed?", "Add the award to your profile and tag your teammates. It's marked confirmed once one of them says yes, and goes back to them if you change it later."],
];

const signInTo = (path: string) => `/login?next=${encodeURIComponent(path)}`;

export default async function Home() {
  const { supabase, userId, isGuest } = await requireUser();
  if (!isGuest) redirect("/opportunities");
  const day = today();

  const [opportunities, teams, awarded, profiles] = await Promise.all([
    supabase
      .from("opportunities")
      .select("*, opportunity_participants(count)")
      .eq("status", "live")
      .or(`deadline.gte.${day},starts_at.gte.${day},and(deadline.is.null,starts_at.is.null)`),
    supabase.from("teams").select(teamSummaryColumns).order("created_at", { ascending: false }).limit(50),
    awardedIds(supabase),
    supabase.from("profiles").select("university").neq("university", "").limit(1000),
  ]);
  // The 3 soonest by their next date, like /opportunities; ones without a date last
  const soonest = ((opportunities.data ?? []) as OpportunityRowData[])
    .map((o) => ({ o, date: nextDate(o, day).date ?? "9999" }))
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 3)
    .map(({ o }) => o);
  const allTeams = (teams.data ?? []) as unknown as TeamSummary[];
  // The 3 newest teams that still have an open role
  const open = allTeams.filter((t) => openRoles(t).length > 0).slice(0, 3);
  // With fewer than 2 teams, opportunities lead and the soonest one asks for a team
  const teamsFirst = open.length >= 2;
  const ask = teamsFirst ? null : (soonest[0] ?? null);
  const universities = byPopularity((profiles.data ?? []).map((p) => p.university as string));

  const opportunityBlock = soonest.length > 0 && (
    <Block title="Soonest opportunities" href="/opportunities" more="All opportunities">
      <OpportunityHeader />
      {soonest.map((o) => <OpportunityRow key={o.id} o={o} day={day} />)}
    </Block>
  );
  const teamBlock = open.length > 0 && (
    <Block title="Teams with open roles" href="/teams" more="All teams">
      <TeamList teams={open} userId={userId} awarded={awarded} empty="" />
    </Block>
  );
  const askBlock = ask && <AskForTeam o={ask} day={day} first={!allTeams.some((t) => t.opportunity?.id === ask.id)} />;

  return (
    <>
      <PublicHeader>
        <Link href="/login" className="text-sm font-semibold hover:text-accent">Sign in</Link>
      </PublicHeader>
      <main className="mx-auto max-w-[1176px] px-4 sm:px-6">
        <section className="grid gap-12 pt-10 pb-16 sm:pt-16 sm:pb-20 lg:grid-cols-[minmax(0,1fr)_minmax(0,520px)] lg:items-center lg:gap-14 lg:pt-20 lg:pb-24 xl:grid-cols-[minmax(0,1fr)_minmax(0,580px)] xl:gap-20">
          <div className="flex flex-col gap-8">
            <div className="flex flex-col gap-4">
              <h1 className="text-[34px] leading-[1.1] font-semibold tracking-[-0.03em] sm:text-5xl xl:text-[56px]">Find teammates for hackathons and projects.</h1>
              <p className="max-w-[560px] text-[17px] leading-normal text-ink2 sm:text-lg">Join a team with open roles or post your own, and keep a profile of what you&apos;ve built.</p>
            </div>
            <SignInOptions />
          </div>
          <HeroPreview />
        </section>

        <Part title="How it works">
          <div className="grid gap-12 md:grid-cols-2 md:gap-10 lg:gap-16">
            <Path
              title="Looking for a team"
              points={["Browse teams by event", "See where your connections are going", "Ask to join the role that fits you"]}
              preview={<LookingPreview />}
              action={<Link href="/teams" className="btn-outline">Browse teams</Link>}
            />
            <Path
              title="Building a team"
              points={["Post what you're building", "List the roles you need", "Review who applies, then accept or decline"]}
              preview={<BuildingPreview />}
              action={<Link href={signInTo("/teams/new")} className="btn-outline">Post a team</Link>}
            />
          </div>
        </Part>

        <Part title="What makes Schub different">
          <div className="grid gap-8 sm:grid-cols-3 lg:gap-12">
            <Point mark={<EventMark />} title="Teams by event" text="Every team is listed under the event it's for, with the days left to apply and the roles still open." />
            <Point mark={<ConfirmedMark />} title="Awards your teammates confirm" text="Tag the people you won with. An award is marked confirmed only once they say yes, not just self-reported." />
            <Point mark={<MatchMark />} title="Matched on what you don't have" text="People suggestions rank skills you don't have above the ones you share, so teams come out complete." />
          </div>
        </Part>

        {(soonest.length > 0 || open.length > 0) && (
          <Part title={<><LiveDot />Live from Schub</>} label="Live from Schub">
            <div className="flex flex-col gap-12">
              {teamsFirst ? <>{teamBlock}{opportunityBlock}</> : <>{opportunityBlock}{askBlock}{teamBlock}</>}
            </div>
          </Part>
        )}

        {universities.length >= 2 && (
          <Part title="Built for students">
            <p className="max-w-[820px] text-lg leading-snug text-pretty sm:text-xl">Students from {namesLine(universities)} have profiles on Schub.</p>
          </Part>
        )}

        <Part title="Questions">
          <dl className="grid gap-x-16 md:grid-cols-2">
            {faq.map(([q, a]) => (
              <div key={q} className="border-t border-border py-4">
                <dt className="text-base font-semibold">{q}</dt>
                <dd className="mt-1 text-[15px] leading-normal text-ink2">{a}</dd>
              </div>
            ))}
          </dl>
        </Part>

        <section className="flex flex-col gap-6 border-t border-line2 py-12 sm:py-16 lg:flex-row lg:items-start lg:justify-between lg:gap-16">
          <div className="flex max-w-[560px] flex-col gap-2">
            <h2 className="text-[28px] leading-tight font-semibold tracking-[-0.02em] sm:text-4xl">Find your team for the next one.</h2>
            <p className="text-[15px] leading-normal text-ink2 sm:text-base">Sign in to post a team, ask to join one, and meet people whose skills complement yours.</p>
          </div>
          <SignInOptions />
        </section>
      </main>
      <footer className="border-t border-border">
        <nav aria-label="Browse" className="mx-auto flex max-w-[1176px] gap-6 px-4 py-6 text-sm text-ink2 sm:px-6">
          <Link href="/opportunities" className="hover:text-foreground">Opportunities</Link>
          <Link href="/teams" className="hover:text-foreground">Teams</Link>
          <Link href="/people" className="hover:text-foreground">People</Link>
        </nav>
      </footer>
    </>
  );
}

// Each university once (ignoring case), the ones most profiles list first
function byPopularity(names: string[]) {
  const counts = new Map<string, { name: string; n: number }>();
  for (const raw of names) {
    const name = raw.trim();
    if (!name) continue;
    const c = counts.get(name.toLowerCase()) ?? { name, n: 0 };
    c.n += 1;
    counts.set(name.toLowerCase(), c);
  }
  return [...counts.values()].sort((a, b) => b.n - a.n || a.name.localeCompare(b.name)).map((c) => c.name);
}

// "A, B and C", or the first five "and 3 more"
function namesLine(names: string[]) {
  const shown = names.slice(0, 5);
  const parts = names.length > shown.length ? [...shown, `${names.length - shown.length} more`] : shown;
  return `${parts.slice(0, -1).join(", ")} and ${parts.at(-1)}`;
}

// A landing section: the title as on the profile, generous space around it, tight inside
function Part({ title, label, children }: { title: ReactNode; label?: string; children: ReactNode }) {
  return (
    <section aria-label={label ?? (typeof title === "string" ? title : undefined)} className="flex flex-col gap-6 border-t border-line2 py-14 sm:gap-8 sm:py-20">
      <h2 className="flex items-center gap-2 text-[15px] font-semibold">{title}</h2>
      {children}
    </section>
  );
}

// A small accent dot that pulses, for data that's current
function LiveDot() {
  return (
    <span aria-hidden className="relative flex h-2 w-2">
      <span className="absolute h-full w-full rounded-full bg-accent opacity-60 motion-safe:animate-ping" />
      <span className="relative h-2 w-2 rounded-full bg-accent" />
    </span>
  );
}

// One way to use Schub: what you do, how it looks, and where to start
function Path({ title, points, preview, action }: { title: string; points: string[]; preview: ReactNode; action: ReactNode }) {
  return (
    <div className="flex flex-col gap-5">
      <h3 className="text-2xl font-semibold tracking-[-0.02em] sm:text-[28px]">{title}</h3>
      <ol className="flex flex-col gap-1.5">
        {points.map((p, i) => (
          <li key={p} className="flex gap-3 text-[15px] text-ink2 sm:text-base">
            <span className="font-mono text-[13px] text-muted tabular-nums sm:pt-px">{String(i + 1).padStart(2, "0")}</span>
            {p}
          </li>
        ))}
      </ol>
      <div className="mt-1">{preview}</div>
      <div>{action}</div>
    </div>
  );
}

function Point({ mark, title, text }: { mark: ReactNode; title: string; text: string }) {
  return (
    <div className="flex flex-col gap-2 border-t border-border pt-4">
      {mark}
      <h3 className="mt-1 text-[17px] font-semibold">{title}</h3>
      <p className="text-[15px] leading-normal text-ink2">{text}</p>
    </div>
  );
}

// "Be the first to post a team for X": with few teams, the soonest opportunity asks for one
function AskForTeam({ o, day, first }: { o: OpportunityRowData; day: string; first: boolean }) {
  const next = nextDate(o, day);
  const when = next.date ? `${next.label} · ${daysLabel(daysUntil(next.date, day))}. ` : "";
  return (
    <EmptyPrompt title={`${first ? "Be the first to post a team" : "Post a team"} for ${o.title}`} text={`${when}List the roles you need, and people going can ask to join.`}>
      <Link href={signInTo(`/teams/new?opportunity=${o.id}`)} className="btn">Post a team</Link>
    </EmptyPrompt>
  );
}

// A titled list in "Live from Schub", with a link to the full page
function Block({ title, href, more, children }: { title: string; href: string; more: string; children: ReactNode }) {
  return (
    <section aria-label={title} className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between gap-4">
        <h3 className="text-lg font-semibold tracking-[-0.01em] sm:text-xl">{title}</h3>
        <Link href={href} className="text-sm font-semibold text-accent hover:underline">{more}</Link>
      </div>
      <div>{children}</div>
    </section>
  );
}
