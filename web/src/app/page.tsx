import type { ReactNode } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/supabase/server";
import { nextDate, today } from "@/lib/opportunities";
import { openRoles, teamSummaryColumns, type TeamSummary } from "@/lib/teams";
import { awardedIds } from "@/lib/awards";
import { OpportunityHeader, OpportunityRow, type OpportunityRowData } from "./(app)/opportunities/opportunity-row";
import { TeamList } from "./(app)/team-list";
import { Section, Timeline, TimelineEntry } from "./(app)/u/[id]/profile-parts";
import { PublicHeader } from "./public-header";
import { SignInOptions } from "./sign-in-options";

// Signed-out visitors get the landing page; members go straight to opportunities
export const instant = false;

const steps = [
  ["Build your profile", "List your skills and what you've built, so team leads can see what you bring."],
  ["Find a team or post one", "Ask to join a team with an open role, or post your own and list the roles you need."],
  ["Win together", "Ship it as a team, then add the award to your profile and tag your teammates."],
];

// Clearly made up: shown as an example of the Experience timeline
const sample = [
  { role: "Backend developer", company: "Example University Robotics Club", type: "Club / Society", location: "Seoul", remote: false, start_date: "2025-03-01", end_date: null, description: "Built the API that streams sensor data from the club's rover to its dashboard.", skills: ["Go", "PostgreSQL"] },
  { role: "Team lead", company: "Sample Hack 2025", type: "Hackathon team", location: "", remote: true, start_date: "2025-08-01", end_date: "2025-08-01", description: "Led a team of four to second place with a study-group matching app.", skills: ["React", "Figma"] },
];

export default async function Home() {
  const { supabase, userId, isGuest } = await requireUser();
  if (!isGuest) redirect("/opportunities");
  const day = today();

  const [opportunities, teams, awarded] = await Promise.all([
    supabase
      .from("opportunities")
      .select("*, opportunity_participants(count)")
      .eq("status", "live")
      .or(`deadline.gte.${day},starts_at.gte.${day},and(deadline.is.null,starts_at.is.null)`),
    supabase.from("teams").select(teamSummaryColumns).order("created_at", { ascending: false }).limit(50),
    awardedIds(supabase),
  ]);
  // The 3 soonest by their next date, like /opportunities; ones without a date last
  const soonest = ((opportunities.data ?? []) as OpportunityRowData[])
    .map((o) => ({ o, date: nextDate(o, day).date ?? "9999" }))
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 3)
    .map(({ o }) => o);
  // The 3 newest teams that still have an open role
  const open = ((teams.data ?? []) as unknown as TeamSummary[]).filter((t) => openRoles(t).length > 0).slice(0, 3);

  return (
    <>
      <PublicHeader>
        <Link href="/login" className="text-sm font-semibold hover:text-accent">Sign in</Link>
      </PublicHeader>
      <main className="mx-auto max-w-[1176px] px-4 sm:px-6">
        <section className="flex flex-col gap-8 pt-12 pb-14 sm:pt-20 sm:pb-20 lg:flex-row lg:items-end lg:justify-between lg:gap-16">
          <div className="flex max-w-[680px] flex-col gap-4">
            <h1 className="text-[34px] leading-[1.1] font-semibold tracking-[-0.03em] sm:text-5xl lg:text-[56px]">Find teammates for hackathons and projects.</h1>
            <p className="text-[17px] leading-normal text-ink2 sm:text-lg">Join a team with open roles or post your own, and keep a profile of what you&apos;ve built.</p>
          </div>
          <SignInOptions />
        </section>

        {(soonest.length > 0 || open.length > 0) && (
          <section className="flex flex-col gap-10 border-t border-line2 py-8 sm:py-10">
            <h2 className="text-[15px] font-semibold">Live from Schub</h2>
            {soonest.length > 0 && (
              <Block title="Soonest opportunities" href="/opportunities" more="All opportunities">
                <OpportunityHeader />
                {soonest.map((o) => <OpportunityRow key={o.id} o={o} day={day} />)}
              </Block>
            )}
            {open.length > 0 && (
              <Block title="Teams with open roles" href="/teams" more="All teams">
                <TeamList teams={open} userId={userId} awarded={awarded} empty="" />
              </Block>
            )}
          </section>
        )}

        <Section title="How it works">
          <ol className="flex flex-col">
            {steps.map(([title, text], i) => (
              <li key={title} className="grid grid-cols-[32px_minmax(0,1fr)] gap-x-3 border-b border-border py-4 first:pt-0 last:border-b-0 sm:grid-cols-[40px_220px_minmax(0,1fr)] sm:gap-x-6">
                <span className="font-mono text-[13px] text-muted tabular-nums sm:pt-px">{String(i + 1).padStart(2, "0")}</span>
                <span className="text-base font-semibold">{title}</span>
                <span className="col-start-2 mt-1 text-[15px] leading-normal text-ink2 sm:col-start-3 sm:mt-0">{text}</span>
              </li>
            ))}
          </ol>
        </Section>

        <Section title="Example profile">
          <div className="mb-6 flex flex-col gap-1">
            <p className="text-xl font-semibold tracking-[-0.01em]">Alex Sample</p>
            <p className="text-sm text-ink2">Sample data, not a real person · Computer Science, Example University</p>
          </div>
          <Timeline>
            {sample.map((e) => <TimelineEntry key={e.role} experience={e} />)}
          </Timeline>
        </Section>

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
