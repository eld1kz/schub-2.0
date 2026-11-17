import type { ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { formatPeriod, mediaUrl, webLink, type Experience, type Project } from "@/lib/portfolio";
import { groupSkills } from "@/lib/skills";
import { Avatar } from "../../avatar";
import { About } from "./about";
import { GitHubIcon, LinkedInIcon, WebsiteIcon } from "./link-icons";

export type ProfileData = {
  name: string;
  headline: string;
  university: string;
  graduation_year: number;
  bio: string;
  skills: string[];
  interests: string[];
  looking_for: string[];
  goals: string[];
  open_to_collaborate: boolean;
  avatar_url: string;
  github: string;
  linkedin: string;
  website: string;
};

export type Connection = { id: string; name: string; avatar_url: string };

type Props = {
  profile: ProfileData;
  isSelf: boolean;
  action: ReactNode;
  contact?: { telegram: string; email: string };
  projects: Project[];
  experiences: Experience[];
  teams: { id: string; title: string; role: string }[];
  events: { id: string; title: string }[];
  ideas: { id: string; title: string; description: string; skills_needed: string[]; stage: string }[];
  connections: Connection[];
};

const shownConnections = 6;

function Chips({ items, small = false }: { items: string[]; small?: boolean }) {
  return (
    <ul className="flex flex-wrap gap-2">
      {items.map((item) => (
        <li key={item} className={`rounded-full border border-border ${small ? "px-2 py-0.5 text-xs text-muted" : "px-3 py-1 text-sm"}`}>{item}</li>
      ))}
    </ul>
  );
}

function SectionHeading({ title, add }: { title: string; add?: { href: string; label: string } }) {
  return (
    <div className="mb-3 flex items-baseline justify-between gap-4">
      <h2 className="font-semibold">{title}</h2>
      {add && <Link href={add.href} className="text-sm underline">{add.label}</Link>}
    </div>
  );
}

function ConnectionList({ people }: { people: Connection[] }) {
  return (
    <ul className="grid grid-cols-3 gap-3 sm:grid-cols-6">
      {people.map((c) => (
        <li key={c.id}>
          <Link href={`/u/${c.id}`} className="flex flex-col items-center gap-1 text-center hover:opacity-80">
            <Avatar url={c.avatar_url} name={c.name} className="h-10 w-10 text-sm" sizes="40px" />
            <span className="w-full truncate text-xs">{c.name || "Unnamed"}</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

function ProjectCard({ project: p, isSelf }: { project: Project; isSelf: boolean }) {
  const image = mediaUrl(p.image_url);
  const live = webLink(p.url);
  const code = webLink(p.repo_url);
  const where = [p.role, p.built_at, p.year].filter(Boolean).join(" · ");
  return (
    <article className="flex flex-col overflow-hidden rounded-lg border border-border">
      {image && (
        <div className="relative aspect-video border-b border-border">
          <Image src={image} alt="" fill sizes="(min-width: 640px) 320px, 100vw" className="object-cover" />
        </div>
      )}
      <div className="flex flex-1 flex-col gap-2 p-4">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <h3 className="font-semibold">{p.title}</h3>
          {p.result && <span className="rounded-full bg-foreground px-2 py-0.5 text-xs font-medium text-background">{p.result}</span>}
        </div>
        {p.tagline && <p className="text-sm">{p.tagline}</p>}
        {where && <p className="text-sm text-muted">{where}</p>}
        {p.description && <p className="whitespace-pre-wrap text-sm text-muted">{p.description}</p>}
        {p.skills.length > 0 && <Chips items={p.skills} small />}
        {(live || code || isSelf) && (
          <p className="mt-auto flex flex-wrap gap-x-4 pt-2 text-sm">
            {live && <a href={live} target="_blank" rel="noreferrer" className="underline">See it</a>}
            {code && <a href={code} target="_blank" rel="noreferrer" className="underline">Code</a>}
            {isSelf && <Link href={`/profile/projects/${p.id}`} className="ml-auto text-muted underline">Edit</Link>}
          </p>
        )}
      </div>
    </article>
  );
}

export function ProfileView({ profile: p, isSelf, action, contact, projects, experiences, teams, events, ideas, connections }: Props) {
  const links = [
    { label: "GitHub", href: webLink(p.github), icon: <GitHubIcon /> },
    { label: "LinkedIn", href: webLink(p.linkedin), icon: <LinkedInIcon /> },
    { label: "Website", href: webLink(p.website), icon: <WebsiteIcon /> },
  ].filter((l) => l.href);
  const education = [p.university, p.graduation_year ? `Class of ${p.graduation_year}` : ""].filter(Boolean).join(" · ");
  const skillGroups = groupSkills(p.skills);

  return (
    <div className="divide-y divide-border [&>section]:py-6 [&>section:first-child]:pt-0">
      <section className="flex gap-4">
        <Avatar url={p.avatar_url} name={p.name} className="h-20 w-20 text-2xl" sizes="80px" priority />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <h1 className="text-2xl font-semibold tracking-tight">{p.name || "Unnamed"}</h1>
            {action}
          </div>
          {p.headline && <p className="mt-0.5 text-muted">{p.headline}</p>}
          {education && <p className="mt-1 text-sm text-muted">{education}</p>}
          {(p.open_to_collaborate || links.length > 0) && (
            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
              {p.open_to_collaborate && (
                <span className="inline-flex items-center gap-1.5 text-sm text-green-700 dark:text-green-400">
                  <span aria-hidden className="h-2 w-2 rounded-full bg-green-500" />
                  Open to collaborate
                </span>
              )}
              {links.map((l) => (
                <a key={l.label} href={l.href ?? ""} target="_blank" rel="noreferrer" aria-label={l.label} title={l.label} className="text-muted hover:text-foreground">
                  {l.icon}
                </a>
              ))}
            </div>
          )}
        </div>
      </section>

      {contact && (
        <section className="text-sm">
          <h2 className="mb-2 font-semibold">Contact</h2>
          {!contact.telegram && !contact.email && <p className="text-muted">No contact details added yet.</p>}
          <dl className="space-y-1">
            {contact.telegram && (
              <div className="flex gap-2"><dt className="text-muted">Telegram</dt><dd><a href={`https://t.me/${encodeURIComponent(contact.telegram)}`} target="_blank" rel="noreferrer" className="underline">@{contact.telegram}</a></dd></div>
            )}
            {contact.email && (
              <div className="flex gap-2"><dt className="text-muted">Email</dt><dd><a href={`mailto:${contact.email}`} className="break-all underline">{contact.email}</a></dd></div>
            )}
          </dl>
        </section>
      )}

      {p.bio && (
        <section>
          <SectionHeading title="About" />
          <About text={p.bio} />
        </section>
      )}

      {(skillGroups.length > 0 || p.goals.length > 0 || p.interests.length > 0 || p.looking_for.length > 0) && (
        <section className="space-y-4">
          {skillGroups.length > 0 && (
            <div>
              <SectionHeading title="Skills" />
              <div className="space-y-3">
                {skillGroups.map((g) => (
                  <div key={g.name}>
                    <h3 className="mb-1.5 text-xs font-medium tracking-wide text-muted uppercase">{g.name}</h3>
                    <ul className="flex flex-wrap gap-2">
                      {g.skills.map((s) => <li key={s} className="skill">{s}</li>)}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          )}
          {p.goals.length > 0 && <div><h2 className="mb-2 text-sm text-muted">Looking for</h2><Chips items={p.goals} /></div>}
          {p.interests.length > 0 && <div><h2 className="mb-2 text-sm text-muted">Interested in</h2><Chips items={p.interests} /></div>}
          {p.looking_for.length > 0 && <div><h2 className="mb-2 text-sm text-muted">Wants to team up with</h2><Chips items={p.looking_for} /></div>}
        </section>
      )}

      {(projects.length > 0 || isSelf) && (
        <section>
          <SectionHeading title="Projects" add={isSelf ? { href: "/profile/projects/new", label: "Add project" } : undefined} />
          {projects.length === 0 ? (
            <p className="rounded-md border border-border p-4 text-sm text-muted">
              Nothing here yet. Projects are the first thing people look at when they pick teammates: add one thing you built, even a small one.
            </p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {projects.map((project) => <ProjectCard key={project.id} project={project} isSelf={isSelf} />)}
            </div>
          )}
        </section>
      )}

      {(experiences.length > 0 || isSelf) && (
        <section>
          <SectionHeading title="Experience" add={isSelf ? { href: "/profile/experience/new", label: "Add experience" } : undefined} />
          {experiences.length === 0 && <p className="text-sm text-muted">Internships, jobs, clubs and research go here.</p>}
          <div className="divide-y divide-border">
            {experiences.map((e) => (
              <article key={e.id} className="py-4 first:pt-0">
                <div className="flex items-baseline justify-between gap-4">
                  <h3 className="font-medium">{e.role}</h3>
                  {isSelf && <Link href={`/profile/experience/${e.id}`} className="text-sm text-muted underline">Edit</Link>}
                </div>
                <p className="text-sm text-muted">{e.company} · {formatPeriod(e.start_date, e.end_date)}</p>
                {e.description && <p className="mt-2 whitespace-pre-wrap text-sm">{e.description}</p>}
              </article>
            ))}
          </div>
        </section>
      )}

      {(teams.length > 0 || events.length > 0) && (
        <section>
          <SectionHeading title="On Schub" />
          <div className="divide-y divide-border border-t border-border text-sm">
            {teams.map((t) => (
              <Link key={t.id} href={`/teams/${t.id}`} className="flex items-baseline justify-between gap-4 py-3 hover:opacity-80">
                <span className="font-medium">{t.title}</span>
                <span className="text-muted">{t.role}</span>
              </Link>
            ))}
            {events.map((e) => (
              <Link key={e.id} href={`/opportunities/${e.id}`} className="flex items-baseline justify-between gap-4 py-3 hover:opacity-80">
                <span className="font-medium">{e.title}</span>
                <span className="text-muted">Looking for a team</span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {ideas.length > 0 && (
        <section>
          <SectionHeading title="Ideas" />
          <div className="divide-y divide-border border-t border-border">
            {ideas.map((idea) => (
              <article key={idea.id} className="py-4">
                <p className="font-medium">{idea.title} <span className="ml-1 text-xs font-normal text-muted uppercase">{idea.stage}</span></p>
                {idea.description && <p className="mt-1 whitespace-pre-wrap text-sm">{idea.description}</p>}
                {idea.skills_needed.length > 0 && <p className="mt-2 text-sm text-muted">Needs: {idea.skills_needed.join(", ")}</p>}
              </article>
            ))}
          </div>
        </section>
      )}

      {connections.length > 0 && (
        <section>
          <SectionHeading title={`Connections · ${connections.length}`} />
          <ConnectionList people={connections.slice(0, shownConnections)} />
          {connections.length > shownConnections && (
            <details className="group mt-3">
              <summary className="cursor-pointer list-none text-sm text-muted underline hover:text-foreground group-open:hidden">
                See all {connections.length} connections
              </summary>
              <ConnectionList people={connections.slice(shownConnections)} />
            </details>
          )}
        </section>
      )}
    </div>
  );
}
