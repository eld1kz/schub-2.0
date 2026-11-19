import type { ReactNode } from "react";
import { today } from "@/lib/opportunities";
import { matchReason } from "@/lib/match";
import { goingLabel } from "@/lib/connections";
import type { TeamSummary } from "@/lib/teams";
import type { Award } from "@/lib/awards";
import { TeamList } from "./(app)/team-list";
import { Avatar } from "./(app)/avatar";
import { Timeline, TimelineEntry } from "./(app)/u/[id]/profile-parts";
import { AwardItem, TrustLabels } from "./(app)/u/[id]/awards";

// Made-up people and teams for the landing page's previews, drawn with the app's own components.
// Every preview is `inert` (not clickable or focusable) and marked `data-sample`, so tests can tell it from real data.
// The ids match nothing in the database.

const alex = { id: "00000000-0000-4000-f000-000000000001", name: "Alex Sample", avatar_url: "", university: "Example University" };
const jordan = { id: "00000000-0000-4000-f000-000000000002", name: "Jordan Example", avatar_url: "", university: "Example University" };

// A few days from now, so the time left shows in the accent like a deadline that's close
function soon() {
  return new Date(Date.parse(today()) + 5 * 86_400_000).toISOString().slice(0, 10);
}

const sampleTeam = (): TeamSummary => ({
  id: "00000000-0000-4000-f000-000000000010",
  title: "AI study buddy for university students",
  roles: ["Backend", "iOS developer", "Designer"],
  owner_id: alex.id,
  owner: alex,
  opportunity: { id: "00000000-0000-4000-f000-000000000020", title: "Sample Hack Seoul", deadline: soon(), starts_at: null, ends_at: null },
  team_applications: [{ role: "Backend", status: "accepted", user_id: jordan.id, person: jordan }],
});

const sampleAward: Award = {
  id: "00000000-0000-4000-f000-000000000030",
  user_id: alex.id,
  placement: "1st",
  prize_name: "Best student project",
  opportunity_id: null,
  event_name: "Sample Hack 2025",
  awarded_on: "2025-08-01",
  project_id: null,
  team_id: null,
  proof_url: "",
  description: "",
  opportunity: null,
  project: null,
  team: null,
  owner: alex,
  award_teammates: [{ user_id: jordan.id, status: "confirmed", person: jordan }],
};

const sampleExperience = {
  role: "Backend developer",
  company: "Example University Robotics Club",
  type: "Club / Society",
  location: "Seoul",
  remote: false,
  start_date: "2025-03-01",
  end_date: null,
  description: "",
  skills: ["Go", "PostgreSQL"],
};

// Looks like a piece of a screenshot: a light border and a soft shadow
const frame = "rounded-lg border border-border bg-background shadow-lg shadow-black/[0.06] dark:shadow-black/40";
const label = "font-mono text-[11px] font-medium tracking-[0.04em] text-muted uppercase";

function Sample({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div data-sample inert className={className}>{children}</div>;
}

// The hero: a team row that leads with your connection, over a slice of that person's profile
export function HeroPreview() {
  return (
    <figure className="flex flex-col gap-3">
      <Sample className="flex flex-col rounded-xl bg-chip/60 p-3 sm:p-6">
        <div className={`relative z-10 px-4 sm:mr-10 sm:px-5 lg:mr-4 xl:mr-10 [&_article]:border-b-0 ${frame}`}>
          <TeamList teams={[sampleTeam()]} userId="" awarded={new Set([alex.id])} connections={new Set([alex.id])} empty="" />
        </div>
        <div className={`-mt-4 ml-3 flex flex-col gap-5 px-4 pt-9 pb-5 sm:ml-10 sm:px-6 ${frame}`}>
          <div className="flex items-center gap-3">
            <Avatar url="" name={alex.name} className="h-10 w-10 text-sm" sizes="40px" />
            <div className="flex flex-col">
              <p className="text-base font-semibold">{alex.name}</p>
              <p className="text-[13px] text-ink2">Backend developer · {alex.university}</p>
            </div>
          </div>
          <div className="flex flex-col gap-3">
            <p className={label}>Experience</p>
            <Timeline><TimelineEntry experience={sampleExperience} /></Timeline>
          </div>
          <div className="flex flex-col gap-3 [&_article]:border-b-0 [&_article]:pb-0">
            <p className={label}>Awards</p>
            <AwardItem award={sampleAward} profileId={alex.id} waiting={0} />
          </div>
        </div>
      </Sample>
      <figcaption className="font-mono text-[11px] text-muted">Preview with sample data, not real people</figcaption>
    </figure>
  );
}

// "Looking for a team": an event with the time left, your connections going, and its open roles
export function LookingPreview() {
  return (
    <Sample className={`flex flex-col gap-3 p-4 sm:p-5 ${frame}`}>
      <div className="flex flex-col gap-1">
        <p className="font-mono text-[11px] font-medium tracking-[0.04em] text-ink2 uppercase">
          Sample Hack Seoul · <span className="font-semibold text-accent">5 days left</span>
        </p>
        <p className="text-sm font-medium text-accent">{goingLabel(2)}</p>
      </div>
      <div className="flex flex-col">
        {["iOS developer", "Designer"].map((role) => (
          <div key={role} className="flex items-center justify-between gap-4 border-t border-border py-2.5 last:pb-0">
            <span className="text-[15px] font-semibold">{role}</span>
            <span className="btn-outline h-8 text-[13px]">Ask to join</span>
          </div>
        ))}
      </div>
    </Sample>
  );
}

// "Building a team": one application waiting for the owner, as the team page shows it
export function BuildingPreview() {
  return (
    <Sample className={`flex flex-col gap-3 p-4 sm:p-5 ${frame}`}>
      <p className="border-b border-line2 pb-2 text-sm font-semibold">iOS developer <span className="font-normal text-muted">1</span></p>
      <div className="flex flex-col gap-1.5">
        <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
          <span className="flex items-center gap-2.5">
            <Avatar url="" name={jordan.name} className="h-8 w-8 text-[11px]" sizes="32px" />
            <span className="text-[15px] font-medium">{jordan.name}</span>
          </span>
          <span className="text-sm text-ink2">{jordan.university}</span>
        </div>
        <p className="text-[15px] leading-normal">Built two iOS apps in SwiftUI, free every evening.</p>
        <ul className="flex flex-wrap gap-1.5">
          {["Swift", "SwiftUI", "Figma"].map((s) => <li key={s} className="skill px-1.5 text-xs">{s}</li>)}
        </ul>
      </div>
      <div className="flex gap-2">
        <span className="btn h-8 px-4 text-[13px]">Accept</span>
        <span className="btn-outline h-8 text-[13px]">Decline</span>
      </div>
    </Sample>
  );
}

// The small marks above each "What makes Schub different" block
export function EventMark() {
  return (
    <Sample>
      <p className="font-mono text-[11px] font-medium tracking-[0.04em] text-ink2 uppercase">
        Sample Hack Seoul · <span className="font-semibold text-accent">5 days left</span>
      </p>
    </Sample>
  );
}

export function ConfirmedMark() {
  return <Sample><TrustLabels award={sampleAward} /></Sample>;
}

// matchReason's own words for someone with Swift and Figma, seen by someone who knows React
export function MatchMark() {
  const reason = matchReason({ skills: ["Swift", "Figma"], interests: [], open_to_collaborate: true }, { skills: ["React"], interests: [], open_to_collaborate: true });
  return <Sample><p className="text-[13px] font-medium text-accent">{reason}</p></Sample>;
}
