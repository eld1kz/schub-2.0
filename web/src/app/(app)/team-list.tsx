import Link from "next/link";
import { openRoles, type TeamSummary } from "@/lib/teams";
import { AwardMark } from "./award-mark";

const columns = "lg:grid lg:grid-cols-[minmax(0,1fr)_300px_240px_120px] lg:gap-8";

// Teams as rows of a ruled table from lg up: the team, the roles it needs, what it's for, and an action.
// Below lg each team stacks, and the title is the way in.
// `awarded`: people with an award, who get a small medal after their name
export function TeamList({ teams, userId, awarded, empty }: { teams: TeamSummary[]; userId: string; awarded: Set<string>; empty: string }) {
  if (teams.length === 0) return <p className="py-8 text-sm text-ink2">{empty}</p>;
  return (
    <div>
      <div className={`hidden border-b border-border py-3 text-xs font-semibold tracking-[0.04em] text-muted ${columns}`}>
        <span>TEAM</span>
        <span>NEEDS</span>
        <span>FOR</span>
        <span />
      </div>
      {teams.map((t) => {
        const open = openRoles(t);
        const mine = t.owner_id === userId;
        // Owners see every application to their team; everyone else only sees accepted ones and their own
        const toReview = mine ? t.team_applications.filter((a) => a.status === "pending").length : 0;
        // The owner plus everyone accepted, out of the owner plus one person per role
        const members = 1 + t.roles.length - open.length;
        const size = `${members} of ${1 + t.roles.length} filled`;
        return (
          <article key={t.id} className={`flex flex-col gap-2 border-b border-border py-5 lg:items-start lg:py-6 ${columns}`}>
            <div className="flex min-w-0 flex-col gap-1.5">
              <h3 className="text-[17px] font-semibold lg:text-lg">
                <Link href={`/teams/${t.id}`} className="hover:text-accent">{t.title}</Link>
              </h3>
              {t.description && <p className="line-clamp-2 text-sm leading-normal lg:text-[15px]">{t.description}</p>}
              <p className="text-[13px] text-ink2 lg:mt-1.5">
                {mine ? "Your team" : t.owner?.name || "Unnamed"}
                {!mine && awarded.has(t.owner_id) && <> <AwardMark /></>} · {size}
                {toReview > 0 && <span className="font-semibold text-accent"> · {toReview} to review</span>}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-1.5 lg:pt-0.5">
              {open.length > 0 && <span className="text-[13px] text-muted lg:hidden">Need</span>}
              {open.length > 0 ? (
                open.map((r) => <span key={r} className="rounded border border-accent px-2 py-0.5 text-[13px] font-medium text-accent lg:px-2.5 lg:py-1 lg:text-sm">{r}</span>)
              ) : (
                <span className="text-sm text-muted">All roles filled</span>
              )}
            </div>
            {t.opportunity ? (
              <Link href={`/opportunities/${t.opportunity.id}`} className="w-fit text-[13px] leading-snug font-medium text-accent hover:underline lg:pt-1 lg:text-sm">
                {t.opportunity.title}
              </Link>
            ) : (
              <span className="hidden text-sm text-muted lg:block lg:pt-1">Own project</span>
            )}
            <Link href={`/teams/${t.id}`} className="btn-outline hidden h-9 lg:inline-flex">
              {mine ? "Manage" : open.length > 0 ? "Ask to join" : "View"}
            </Link>
          </article>
        );
      })}
    </div>
  );
}
