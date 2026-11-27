import type { ReactNode } from "react";
import { today } from "@/lib/opportunities";
import { matchReason } from "@/lib/match";
import { goingLabel } from "@/lib/connections";
import type { TeamSummary } from "@/lib/teams";
import type { Award } from "@/lib/awards";
import { TeamList } from "./(app)/team-list";
import { ExperienceEntry } from "./(app)/u/[id]/profile-parts";
import { AwardItem, TrustLabels } from "./(app)/u/[id]/awards";
import { Avatar, Chip, ChipList, MonoLabel, Timeline, buttonClass } from "@/components/ui";

// Made-up people and teams for the landing page's previews, drawn with the app's own components.
// Every preview is `inert` (not clickable or focusable) and marked `data-sample`, so tests can tell it from real data.
// The ids match nothing in the database.

const alex = { id: "00000000-0000-4000-f000-000000000001", name: "Alex Sample", avatar_url: "", university: "Example University", open_to_collaborate: false };
const jordan = { id: "00000000-0000-4000-f000-000000000002", name: "Jordan Example", avatar_url: "", university: "Example University", open_to_collaborate: false };

// A few days from now, so the time left shows in the accent like a deadline that's close
function soon() {
  return new Date(Date.parse(today()) + 5 * 86_400_000).toISOString().slice(0, 10);
}

const sampleTeam = (): TeamSummary => ({
  id: "00000000-0000-4000-f000-000000000010",
  title: "AI study buddy for university students",
  roles: ["Backend", "iOS developer", "Designer"],
  languages: [],
  work_mode: "",
  owner_id: alex.id,
  owner: alex,
  team_entries: [],
  opportunity: { id: "00000000-0000-4000-f000-000000000020", title: "Sample Hack Seoul", url: "", deadline: soon(), starts_at: null, ends_at: null },
  team_applications: [{ role: "Backend", status: "accepted", direction: "application", user_id: jordan.id, person: jordan }],
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
const frame = "rounded-md border border-border bg-background shadow-frame";

function Sample({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div data-sample inert className={className}>{children}</div>;
}

// The hero: a team row that leads with your connection, over a slice of that person's profile
export function HeroPreview() {
  return (
    <figure className="flex flex-col gap-3">
      <Sample className="flex flex-col rounded-lg bg-chip/60 p-3 sm:p-6">
        <div className={`relative z-10 px-4 sm:mr-8 lg:mr-4 xl:mr-8 [&_article]:border-b-0 ${frame}`}>
          <TeamList teams={[sampleTeam()]} userId="" awarded={new Set([alex.id])} connections={new Set([alex.id])} empty="" />
        </div>
        <div className={`-mt-4 ml-3 flex flex-col gap-4 px-4 pt-8 pb-4 sm:ml-8 sm:px-6 ${frame}`}>
          <div className="flex items-center gap-3">
            <Avatar url="" name={alex.name} size="lg" />
            <div className="flex flex-col">
              <p className="text-base font-semibold">{alex.name}</p>
              <p className="text-meta text-ink2">Backend developer · {alex.university}</p>
            </div>
          </div>
          <div className="flex flex-col gap-3">
            <MonoLabel as="p" tone="muted">Experience</MonoLabel>
            <Timeline><ExperienceEntry experience={sampleExperience} /></Timeline>
          </div>
          <div className="flex flex-col gap-3 [&_article]:border-b-0 [&_article]:pb-0">
            <MonoLabel as="p" tone="muted">Awards</MonoLabel>
            <AwardItem award={sampleAward} profileId={alex.id} waiting={0} />
          </div>
        </div>
      </Sample>
      <figcaption className="font-mono text-xs text-muted">Preview with sample data, not real people</figcaption>
    </figure>
  );
}

// "Looking for a team": an event with the time left, your connections going, and its open roles
export function LookingPreview() {
  return (
    <Sample className={`flex flex-col gap-3 p-4 ${frame}`}>
      <div className="flex flex-col gap-1">
        <MonoLabel as="p">
          Sample Hack Seoul · <span className="font-semibold text-accent">5 days left</span>
        </MonoLabel>
        <p className="text-sm font-medium text-accent">{goingLabel(2)}</p>
      </div>
      <div className="flex flex-col">
        {["iOS developer", "Designer"].map((role) => (
          <div key={role} className="flex items-center justify-between gap-4 border-t border-border py-2 last:pb-0">
            <span className="text-base font-semibold">{role}</span>
            <span className={buttonClass({ variant: "secondary", size: "xs" })}>Ask to join</span>
          </div>
        ))}
      </div>
    </Sample>
  );
}

// "Building a team": one application waiting for the owner, as the team page shows it
export function BuildingPreview() {
  return (
    <Sample className={`flex flex-col gap-3 p-4 ${frame}`}>
      <p className="border-b border-line2 pb-2 text-sm font-semibold">iOS developer <span className="font-normal text-muted">1</span></p>
      <div className="flex flex-col gap-1.5">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="flex items-center gap-2">
            <Avatar url="" name={jordan.name} size="md" />
            <span className="text-base font-medium">{jordan.name}</span>
          </span>
          <span className="text-sm text-ink2">{jordan.university}</span>
        </div>
        <p className="text-base leading-normal">Built two iOS apps in SwiftUI, free every evening.</p>
        <ChipList>
          {["Swift", "SwiftUI", "Figma"].map((s) => <Chip key={s}>{s}</Chip>)}
        </ChipList>
      </div>
      <div className="flex gap-2">
        <span className={buttonClass({ size: "xs" })}>Accept</span>
        <span className={buttonClass({ variant: "secondary", size: "xs" })}>Decline</span>
      </div>
    </Sample>
  );
}

// The small marks above each "What makes Schub different" block
export function EventMark() {
  return (
    <Sample>
      <MonoLabel as="p">
        Sample Hack Seoul · <span className="font-semibold text-accent">5 days left</span>
      </MonoLabel>
    </Sample>
  );
}

export function ConfirmedMark() {
  return <Sample><TrustLabels award={sampleAward} /></Sample>;
}

// matchReason's own words for someone with Swift and Figma, seen by someone who knows React
export function MatchMark() {
  const reason = matchReason({ skills: ["Swift", "Figma"], interests: [], open_to_collaborate: true }, { skills: ["React"], interests: [], open_to_collaborate: true });
  return <Sample><p className="text-meta font-medium text-accent">{reason}</p></Sample>;
}
