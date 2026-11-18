import type { ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { formatPeriod, mediaUrl, webLink, type Experience, type Project } from "@/lib/portfolio";
import { groupSkills } from "@/lib/skills";
import { Avatar } from "../../avatar";
import { About } from "./about";
import { Card, PageBackground, dividedList } from "./card";
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
const muted = "text-zinc-500 dark:text-zinc-400";
const groupLabel = `mb-2 text-xs font-medium tracking-wide uppercase ${muted}`;

function AddLink({ href, label }: { href: string; label: string }) {
  return <Link href={href} className="text-sm text-indigo-600 hover:underline dark:text-indigo-400">{label}</Link>;
}

function Chips({ items }: { items: string[] }) {
  return (
    <ul className="flex flex-wrap gap-2">
      {items.map((item) => (
        <li key={item} className="rounded-full border border-zinc-200 px-3 py-1 text-sm dark:border-zinc-700">{item}</li>
      ))}
    </ul>
  );
}

function ConnectionList({ people }: { people: Connection[] }) {
  return (
    <ul className="grid grid-cols-3 gap-3 sm:grid-cols-6">
      {people.map((c) => (
        <li key={c.id}>
          <Link href={`/u/${c.id}`} className="flex flex-col items-center gap-1 text-center hover:opacity-80">
            <Avatar url={c.avatar_url} name={c.name} className="h-12 w-12 text-sm" sizes="48px" />
            <span className="w-full truncate text-xs">{c.name || "Unnamed"}</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

function ProjectItem({ project: p, isSelf }: { project: Project; isSelf: boolean }) {
  const image = mediaUrl(p.image_url);
  const live = webLink(p.url);
  const code = webLink(p.repo_url);
  const where = [p.role, p.built_at].filter(Boolean).join(" · ");
  return (
    <article className="flex gap-4">
      {image && (
        <div className="relative h-16 w-24 shrink-0 overflow-hidden rounded-lg border border-zinc-200 dark:border-zinc-800">
          <Image src={image} alt="" fill sizes="96px" className="object-cover" />
        </div>
      )}
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-4">
          <h3 className="font-semibold">{p.title}</h3>
          {p.year !== null && <span className="shrink-0 text-sm text-zinc-400 dark:text-zinc-500">{p.year}</span>}
        </div>
        {p.tagline && <p className="text-sm">{p.tagline}</p>}
        {where && <p className={`text-sm ${muted}`}>{where}</p>}
        {p.result && (
          <span className="mt-2 inline-block rounded-full border border-green-200 bg-green-50 px-2 py-0.5 text-xs font-medium text-green-700 dark:border-green-900 dark:bg-green-950 dark:text-green-300">
            {p.result}
          </span>
        )}
        {p.description && <p className="mt-2 line-clamp-2 text-sm whitespace-pre-wrap">{p.description}</p>}
        {p.skills.length > 0 && (
          <ul className="mt-2 flex flex-wrap gap-1.5">
            {p.skills.map((s) => <li key={s} className="skill px-2 py-0.5 text-xs">{s}</li>)}
          </ul>
        )}
        {(live || code || isSelf) && (
          <p className="mt-2 flex flex-wrap gap-x-4 text-sm">
            {live && <a href={live} target="_blank" rel="noreferrer" className="text-indigo-600 hover:underline dark:text-indigo-400">Live</a>}
            {code && <a href={code} target="_blank" rel="noreferrer" className="text-indigo-600 hover:underline dark:text-indigo-400">Code</a>}
            {isSelf && <Link href={`/profile/projects/${p.id}`} className={`ml-auto hover:underline ${muted}`}>Edit</Link>}
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
    <div className="space-y-4">
      <PageBackground />

      <section className="overflow-hidden rounded-2xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        <div className="h-24 bg-zinc-100 dark:bg-zinc-800" />
        <div className="px-6 pb-6">
          <div className="-mt-12 w-fit rounded-full border-4 border-white bg-white dark:border-zinc-900 dark:bg-zinc-900">
            <Avatar url={p.avatar_url} name={p.name} className="h-22 w-22 text-2xl" sizes="96px" priority />
          </div>
          <div className="mt-3 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="min-w-0">
              <h1 className="text-2xl font-bold tracking-tight">{p.name || "Unnamed"}</h1>
              {p.headline && <p className={`truncate text-base ${muted}`}>{p.headline}</p>}
              {education && <p className="mt-1 text-sm text-zinc-400 dark:text-zinc-500">{education}</p>}
              {p.open_to_collaborate && (
                <p className="mt-2 flex items-center gap-1.5 text-sm text-green-700 dark:text-green-400">
                  <span aria-hidden className="h-2 w-2 rounded-full bg-green-500" />
                  Open to collaborate
                </p>
              )}
            </div>
            <div className="flex shrink-0 items-center gap-4">
              {action}
              {links.map((l) => (
                <a key={l.label} href={l.href ?? ""} target="_blank" rel="noreferrer" aria-label={l.label} title={l.label} className={`hover:text-zinc-900 dark:hover:text-zinc-100 ${muted}`}>
                  {l.icon}
                </a>
              ))}
            </div>
          </div>
        </div>
      </section>

      {p.bio && (
        <Card title="About">
          <About text={p.bio} />
        </Card>
      )}

      {(experiences.length > 0 || isSelf) && (
        <Card title="Experience" action={isSelf && <AddLink href="/profile/experience/new" label="Add experience" />}>
          {experiences.length === 0 && <p className={`text-sm ${muted}`}>Internships, jobs, clubs and research go here.</p>}
          <div className={dividedList}>
            {experiences.map((e) => (
              <article key={e.id}>
                <div className="flex items-baseline justify-between gap-4">
                  <h3 className="font-semibold">{e.role}</h3>
                  {isSelf && <Link href={`/profile/experience/${e.id}`} className={`text-sm hover:underline ${muted}`}>Edit</Link>}
                </div>
                <p className={muted}>{e.company}</p>
                <p className="text-sm text-zinc-400 dark:text-zinc-500">{formatPeriod(e.start_date, e.end_date)}</p>
                {e.description && <p className="mt-2 text-sm whitespace-pre-wrap">{e.description}</p>}
              </article>
            ))}
          </div>
        </Card>
      )}

      {skillGroups.length > 0 && (
        <Card title="Skills">
          <div className="space-y-4">
            {skillGroups.map((g) => (
              <div key={g.name}>
                <h3 className={groupLabel}>{g.name}</h3>
                <ul className="flex flex-wrap gap-2">
                  {g.skills.map((s) => <li key={s} className="skill">{s}</li>)}
                </ul>
              </div>
            ))}
          </div>
        </Card>
      )}

      {(p.goals.length > 0 || p.interests.length > 0 || p.looking_for.length > 0) && (
        <Card title="Interests & Goals">
          <div className="space-y-4">
            {p.goals.length > 0 && <div><h3 className={groupLabel}>Looking for</h3><Chips items={p.goals} /></div>}
            {p.interests.length > 0 && <div><h3 className={groupLabel}>Interested in</h3><Chips items={p.interests} /></div>}
            {p.looking_for.length > 0 && <div><h3 className={groupLabel}>Wants to team up with</h3><Chips items={p.looking_for} /></div>}
          </div>
        </Card>
      )}

      {(projects.length > 0 || isSelf) && (
        <Card title="Projects" action={isSelf && <AddLink href="/profile/projects/new" label="Add project" />}>
          {projects.length === 0 ? (
            <p className={`text-sm ${muted}`}>
              Nothing here yet. Projects are the first thing people look at when they pick teammates: add one thing you built, even a small one.
            </p>
          ) : (
            <div className={dividedList}>
              {projects.map((project) => <ProjectItem key={project.id} project={project} isSelf={isSelf} />)}
            </div>
          )}
        </Card>
      )}

      {(teams.length > 0 || events.length > 0) && (
        <Card title="On Schub">
          <div className={`text-sm ${dividedList}`}>
            {teams.map((t) => (
              <Link key={t.id} href={`/teams/${t.id}`} className="flex items-baseline justify-between gap-4 hover:opacity-80">
                <span className="font-medium">{t.title}</span>
                <span className={muted}>{t.role}</span>
              </Link>
            ))}
            {events.map((e) => (
              <Link key={e.id} href={`/opportunities/${e.id}`} className="flex items-baseline justify-between gap-4 hover:opacity-80">
                <span className="font-medium">{e.title}</span>
                <span className={muted}>Looking for a team</span>
              </Link>
            ))}
          </div>
        </Card>
      )}

      {contact && (
        <Card title="Contact">
          {!contact.telegram && !contact.email && <p className={`text-sm ${muted}`}>No contact details added yet.</p>}
          <dl className="space-y-2 text-sm">
            {contact.telegram && (
              <div className="flex gap-3">
                <dt className={`w-20 shrink-0 ${muted}`}>Telegram</dt>
                <dd><a href={`https://t.me/${encodeURIComponent(contact.telegram)}`} target="_blank" rel="noreferrer" className="text-indigo-600 hover:underline dark:text-indigo-400">t.me/{contact.telegram}</a></dd>
              </div>
            )}
            {contact.email && (
              <div className="flex gap-3">
                <dt className={`w-20 shrink-0 ${muted}`}>Email</dt>
                <dd className="min-w-0"><a href={`mailto:${contact.email}`} className="break-all text-indigo-600 hover:underline dark:text-indigo-400">{contact.email}</a></dd>
              </div>
            )}
          </dl>
        </Card>
      )}

      {connections.length > 0 && (
        <Card title={`${connections.length} ${connections.length === 1 ? "connection" : "connections"}`}>
          <ConnectionList people={connections.slice(0, shownConnections)} />
          {connections.length > shownConnections && (
            <details className="group mt-4">
              <summary className="cursor-pointer list-none text-sm text-indigo-600 hover:underline group-open:hidden dark:text-indigo-400">See all</summary>
              <ConnectionList people={connections.slice(shownConnections)} />
            </details>
          )}
        </Card>
      )}

      {ideas.length > 0 && (
        <Card title="Ideas">
          <div className={dividedList}>
            {ideas.map((idea) => (
              <article key={idea.id}>
                <p className="font-semibold">{idea.title} <span className={`ml-1 text-xs font-normal uppercase ${muted}`}>{idea.stage}</span></p>
                {idea.description && <p className="mt-1 text-sm whitespace-pre-wrap">{idea.description}</p>}
                {idea.skills_needed.length > 0 && <p className={`mt-2 text-sm ${muted}`}>Needs: {idea.skills_needed.join(", ")}</p>}
              </article>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
