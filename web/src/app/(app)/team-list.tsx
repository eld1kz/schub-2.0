import type { ReactNode } from "react";
import Link from "next/link";
import { SOON_DAYS, daysUntil, nextDate, today } from "@/lib/opportunities";
import { memberSummary, openRoles, recruitingRoles, teamMembers, universitiesLabel, type TeamSummary } from "@/lib/teams";
import { storyVersion } from "@/lib/story";
import { workModeLabel } from "@/lib/languages";
import { AwardMark } from "./award-mark";
import { EntryStatusLabel } from "./entry-status";
import { Avatar } from "./avatar";
import { ShareTeamButton } from "./share-team";

// Overlapping avatars: each sits above the next, so the lead's ring is never covered
const stack = ["z-30", "z-20", "z-10", "z-0"];
const daysLeft = (n: number) => (n === 0 ? "Today" : n === 1 ? "1 day left" : `${n} days left`);

// Teams as ruled rows that lead with the event: the event and time left, the title as the pitch, the roles it needs,
// then who's on it. The button sits on the right from sm up; on phones the title is the way in.
// `awarded`: people with an award, who get a small medal after their name
// `applied`: teams you've already applied to, whose button reads "Applied"
// `connections`: your accepted connections. A team with one on it leads with them, ringed in the accent.
// Other members open to a team are ringed in green.
// `event`: on an opportunity's own page. Rows show the team's status there instead of an event line, which would
// repeat the page title, and its open roles only until the event is over.
// Elsewhere a row shows the team's current event, and no open roles once that's over.
// `share`: a share icon on each row, opening the share dialog (Your teams > Running)
export function TeamList({ teams, userId, awarded, applied, connections = new Set(), event, share = false, empty }: {
  teams: TeamSummary[];
  userId: string;
  awarded: Set<string>;
  applied?: Set<string>;
  connections?: Set<string>;
  event?: string;
  share?: boolean;
  empty: ReactNode;
}) {
  if (teams.length === 0) return <p className="py-8 text-sm text-ink2">{empty}</p>;
  const day = today();
  return (
    <div>
      {teams.map((t) => {
        const open = recruitingRoles(t, day, event);
        const status = event ? t.team_entries.find((e) => e.opportunity?.id === event)?.status : undefined;
        const mine = t.owner_id === userId;
        // Owners see every application to their team; everyone else only sees accepted ones and their own
        const toReview = mine ? t.team_applications.filter((a) => a.status === "pending" && a.direction === "application").length : 0;
        const { lead, connected, others, ordered, universities } = memberSummary(teamMembers(t), connections);
        const next = t.opportunity ? nextDate(t.opportunity, day).date : null;
        const days = next ? daysUntil(next, day) : null;
        const leadName = lead ? (lead.id === userId ? "You" : lead.name || "Unnamed") : "";
        return (
          <article key={t.id} className="flex items-start justify-between gap-6 border-b border-border py-4 sm:py-6">
            <div className="flex min-w-0 flex-col gap-1.5">
              {status && <EntryStatusLabel status={status} />}
              {!event && <p className="font-mono text-xs font-medium tracking-wide text-ink2 uppercase">
                {t.opportunity ? (
                  <>
                    <Link href={`/opportunities/${t.opportunity.id}`} className="hover:text-accent">{t.opportunity.title}</Link>
                    {days !== null && <span className={days <= SOON_DAYS ? "font-semibold text-accent" : ""}> · {daysLeft(days)}</span>}
                  </>
                ) : (
                  "Own project"
                )}
              </p>}
              <h3 className="text-lg leading-snug font-semibold text-pretty">
                <Link href={`/teams/${t.id}`} className="hover:text-accent">{t.title}</Link>
              </h3>
              <p className="text-sm sm:text-base">
                {open.length > 0 ? (
                  <><span className="text-muted">Needs:</span> {open.join(", ")}</>
                ) : (
                  // Roles still open, but the event they were for is over
                  <span className="text-muted">{openRoles(t).length > 0 ? "Not recruiting: the event is over" : "All roles filled"}</span>
                )}
              </p>
              {(t.languages.length > 0 || t.work_mode) && (
                <p className="text-meta text-ink2 sm:text-sm">{[t.languages.join(", "), workModeLabel(t.work_mode)].filter(Boolean).join(" · ")}</p>
              )}
              {lead && (
                <div className="mt-1 flex items-center gap-2 text-meta text-ink2 sm:text-sm">
                  <span className="flex shrink-0 -space-x-1.5">
                    {ordered.slice(0, 4).map((m, i) => (
                      <Avatar
                        key={m.id}
                        url={m.avatar_url}
                        name={m.name}
                        className={`h-6 w-6 text-xs ring-2 ${stack[i]} ${connections.has(m.id) ? "ring-accent" : m.open_to_collaborate ? "ring-open" : "ring-background"}`}
                        sizes="24px"
                      />
                    ))}
                  </span>
                  <span className="min-w-0">
                    <span className="font-medium text-foreground">{leadName}</span>
                    {lead.id !== userId && awarded.has(lead.id) && <> <AwardMark /></>}
                    {connected ? (
                      <>, <span className="font-medium text-accent">your connection</span>{others > 0 && `, + ${others} ${others === 1 ? "other" : "others"}`}</>
                    ) : (
                      others > 0 && ` + ${others}`
                    )}
                    {universities.length > 0 && ` · ${universitiesLabel(universities)}`}
                    {/* Phones have no button, so "Applied" goes here */}
                    {applied?.has(t.id) && <span className="sm:hidden"> · Applied</span>}
                    {toReview > 0 && <> · <Link href={`/teams/${t.id}#applications`} className="font-semibold text-accent hover:underline">{toReview} to review</Link></>}
                  </span>
                </div>
              )}
            </div>
            <div className="flex shrink-0 items-center gap-1.5">
              {share && <ShareTeamButton teamId={t.id} title={t.title} version={storyVersion(t)} variant="icon" />}
              {applied?.has(t.id) ? (
                <span className="hidden h-9 shrink-0 items-center justify-center rounded-md border border-border px-4 text-sm font-semibold text-muted sm:inline-flex">Applied</span>
              ) : (
                <Link href={`/teams/${t.id}`} className="btn-outline hidden h-9 shrink-0 sm:inline-flex">
                  {mine ? "Manage" : open.length > 0 ? "Ask to join" : "View"}
                </Link>
              )}
            </div>
          </article>
        );
      })}
    </div>
  );
}
