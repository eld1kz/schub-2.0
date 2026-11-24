import type { ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { answerSharedProject, hideSharedProject } from "@/app/actions";
import { mediaUrl, webLink } from "@/lib/portfolio";
import { builtWith, type SharedProject } from "@/lib/shared-projects";
import type { Award } from "@/lib/awards";
import { Avatar } from "../../avatar";
import { Placement } from "./awards";

const outLink = "text-accent hover:underline";

// "Built with" and the photos of everyone who confirmed, leaving out `except` (the profile it's shown on)
export function BuiltWith({ project, except }: { project: SharedProject; except?: string }) {
  const people = builtWith(project, except);
  if (people.length === 0) return null;
  return (
    <div className="flex items-center gap-2 text-meta text-ink2 sm:text-sm">
      <span>Built with</span>
      <ul className="flex">
        {people.map((p) => (
          <li key={p.id} className="-mr-1.5">
            <Link href={`/u/${p.id}`} title={p.name || "Unnamed"} aria-label={p.name || "Unnamed"} className="block rounded-full border-2 border-background hover:opacity-80">
              <Avatar url={p.avatar_url} name={p.name} className="h-7 w-7 text-xs" sizes="28px" />
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

// What a team built, as a project entry: on profiles and on the team page.
// `award`: the best award for this team, shown in place of the typed-in result. `except`: the profile it's on.
// `edit`: the owner's pencil on the team page, or "Hide from my profile" on your own profile.
export function SharedProjectBody({ project: p, award, except, edit, showTeam = true }: { project: SharedProject; award?: Award; except?: string; edit?: ReactNode; showTeam?: boolean }) {
  const image = mediaUrl(p.image_url);
  const live = webLink(p.url);
  const code = webLink(p.repo_url);
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between gap-4">
        <h3 className="min-w-0 text-lg font-semibold tracking-snug break-words">{p.title}</h3>
        <div className="flex shrink-0 items-center gap-2">
          {award ? <Placement placement={award.placement} /> : p.result && <span className="text-right text-meta font-semibold text-accent sm:text-sm">{p.result}</span>}
          {edit && <span className="-my-2">{edit}</span>}
        </div>
      </div>
      {p.pitch && <p className="max-w-prose text-sm leading-normal sm:text-base">{p.pitch}</p>}
      {showTeam && p.team && (
        <p className="text-meta text-ink2 sm:text-sm">
          Team <Link href={`/teams/${p.team.id}`} className="font-medium text-foreground hover:text-accent">{p.team.title}</Link>
          {award && ` · ${award.opportunity?.title ?? award.event_name}`}
        </p>
      )}
      {image && (
        <div className="relative mt-1 aspect-[3/2] w-60 overflow-hidden rounded-md border border-border">
          <Image src={image} alt="" fill sizes="240px" className="object-cover" />
        </div>
      )}
      <div className="mt-1 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
        <BuiltWith project={p} except={except} />
        {(live || code) && (
          <p className="flex gap-4 text-sm font-medium">
            {live && <a href={live} target="_blank" rel="noreferrer" className={outLink}>Live ↗</a>}
            {code && <a href={code} target="_blank" rel="noreferrer" className={outLink}>Code ↗</a>}
          </p>
        )}
      </div>
    </div>
  );
}

// On your own profile: hide a confirmed shared project from it (you stay in "Built with")
export function HideButton({ projectId }: { projectId: string }) {
  return (
    <form action={hideSharedProject.bind(null, projectId, true)}>
      <button className="h-9 text-meta text-ink2 hover:text-foreground">Hide from my profile</button>
    </form>
  );
}

// On your own profile: put a hidden shared project back
export function ShowAgainButton({ projectId }: { projectId: string }) {
  return (
    <form action={hideSharedProject.bind(null, projectId, false)}>
      <button className="text-meta font-medium text-accent hover:underline">Show on my profile</button>
    </form>
  );
}

// At the top of your own profile: projects your teams recorded that wait for your answer
export function PendingSharedProjects({ projects }: { projects: SharedProject[] }) {
  return (
    <section aria-label="Projects to confirm" className="mb-8 flex flex-col border-b border-line2 sm:mb-12">
      {projects.map((p) => (
        <div key={p.id} className="flex flex-col gap-3 border-t border-border py-4 first:border-t-0 first:pt-0 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
          <p className="text-base leading-normal">
            Your team <Link href={`/teams/${p.team_id}`} className="font-semibold hover:text-accent">{p.team?.title ?? ""}</Link> recorded what you built:{" "}
            <span className="font-semibold">{p.title}</span>. Show it on your profile?
          </p>
          <div className="flex shrink-0 gap-2">
            <form action={answerSharedProject.bind(null, p.id, "confirmed")}><button className="btn h-9 px-4">Confirm</button></form>
            <form action={answerSharedProject.bind(null, p.id, "declined")}><button className="btn-outline h-9">Decline</button></form>
          </div>
        </div>
      ))}
    </section>
  );
}
