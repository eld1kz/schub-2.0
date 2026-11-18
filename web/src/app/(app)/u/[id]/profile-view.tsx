import type { ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { formatPeriod, mediaUrl, webLink, type Experience, type Project } from "@/lib/portfolio";
import { groupSkills } from "@/lib/skills";
import { Avatar } from "../../avatar";
import { Card, PageBackground, cardBox, dividedList } from "../../card";
import { ProfileCompletion } from "../../profile/completion";
import { About } from "./about";
import { CopyLinkButton } from "./copy-link";
import { GitHubIcon, LinkedInIcon, WebsiteIcon } from "./link-icons";
import { AboutEdit, ContactEdit, ExperienceEdit, HeroEdit, InterestsEdit, LinksEdit, ProjectEdit, SkillsEdit } from "./section-edits";
import { ToastProvider } from "./toast";

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
export type Suggestion = { id: string; name: string; headline: string; avatar_url: string; connect: ReactNode };

type Props = {
  id: string;
  profile: ProfileData;
  // The signed-in owner: every section gets an edit button, and empty ones show up as prompts
  canEdit: boolean;
  action: ReactNode;
  contact?: { telegram: string; email: string };
  projects: Project[];
  experiences: Experience[];
  teams: { id: string; title: string; role: string }[];
  events: { id: string; title: string }[];
  ideas: { id: string; title: string; description: string; skills_needed: string[]; stage: string }[];
  connections: Connection[];
  suggestions: Suggestion[];
};

const shownConnections = 6;
const muted = "text-zinc-500 dark:text-zinc-400";
const groupLabel = `mb-2 text-xs font-medium tracking-wide uppercase ${muted}`;
const textLink = "text-indigo-600 hover:underline dark:text-indigo-400";

// An empty section on your own profile: one line and an Add button. Visitors never see these.
function EmptyCard({ text, children }: { text: string; children: ReactNode }) {
  return (
    <section className="flex items-center justify-between gap-4 rounded-2xl border border-dashed border-zinc-300 p-6 dark:border-zinc-700">
      <p className={`text-sm ${muted}`}>{text}</p>
      {children}
    </section>
  );
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
    <ul className="grid grid-cols-3 gap-3">
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

function ProjectItem({ project: p, edit }: { project: Project; edit?: ReactNode }) {
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
        <div className="flex items-start justify-between gap-4">
          <h3 className="font-semibold">{p.title}</h3>
          <div className="flex shrink-0 items-center gap-2">
            {p.year !== null && <span className="text-sm text-zinc-400 dark:text-zinc-500">{p.year}</span>}
            {edit}
          </div>
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
        {(live || code) && (
          <p className="mt-2 flex flex-wrap gap-x-4 text-sm">
            {live && <a href={live} target="_blank" rel="noreferrer" className={textLink}>Live</a>}
            {code && <a href={code} target="_blank" rel="noreferrer" className={textLink}>Code</a>}
          </p>
        )}
      </div>
    </article>
  );
}

export function ProfileView({ id, profile: p, canEdit, action, contact, projects, experiences, teams, events, ideas, connections, suggestions }: Props) {
  const links = [
    { label: "GitHub", href: webLink(p.github), icon: <GitHubIcon /> },
    { label: "LinkedIn", href: webLink(p.linkedin), icon: <LinkedInIcon /> },
    { label: "Website", href: webLink(p.website), icon: <WebsiteIcon /> },
  ].flatMap((l) => (l.href ? [{ ...l, href: l.href }] : []));
  const education = [p.university, p.graduation_year ? `Class of ${p.graduation_year}` : ""].filter(Boolean).join(" · ");
  const skillGroups = groupSkills(p.skills);
  const hasInterests = p.goals.length > 0 || p.interests.length > 0 || p.looking_for.length > 0;
  const hasContact = Boolean(contact?.telegram || contact?.email);

  return (
    <ToastProvider>
      {/* One column below lg, with the sidebar cards after the main ones */}
      <div className="space-y-4 lg:grid lg:grid-cols-3 lg:items-start lg:gap-6 lg:space-y-0">
        <PageBackground />

        <div className="space-y-4 lg:col-span-2">
          <section className={`${cardBox} relative overflow-hidden`}>
            <div className="h-24 bg-zinc-100 dark:bg-zinc-800" />
            {canEdit && (
              <div className="absolute top-3 right-3 rounded-full bg-white/80 dark:bg-zinc-900/80">
                <HeroEdit profile={p} />
              </div>
            )}
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
                <div className="flex shrink-0 flex-wrap items-center gap-2">
                  {action}
                  <CopyLinkButton path={`/u/${id}`} />
                </div>
              </div>
            </div>
          </section>

          {p.bio ? (
            <Card title="About" action={canEdit && <AboutEdit bio={p.bio} trigger="edit" />}>
              <About text={p.bio} />
            </Card>
          ) : (
            canEdit && <EmptyCard text="Add a short about section"><AboutEdit bio="" trigger="button" /></EmptyCard>
          )}

          {experiences.length > 0 ? (
            <Card title="Experience" action={canEdit && <ExperienceEdit trigger="add" />}>
              <div className={dividedList}>
                {experiences.map((e) => (
                  <article key={e.id}>
                    <div className="flex items-start justify-between gap-4">
                      <h3 className="font-semibold">{e.role}</h3>
                      {canEdit && <ExperienceEdit experience={e} trigger="edit" />}
                    </div>
                    <p className={muted}>{e.company}</p>
                    <p className="text-sm text-zinc-400 dark:text-zinc-500">{formatPeriod(e.start_date, e.end_date)}</p>
                    {e.description && <p className="mt-2 text-sm whitespace-pre-wrap">{e.description}</p>}
                  </article>
                ))}
              </div>
            </Card>
          ) : (
            canEdit && <EmptyCard text="Add an internship, job, club or research role"><ExperienceEdit trigger="button" /></EmptyCard>
          )}

          {skillGroups.length > 0 ? (
            <Card title="Skills" action={canEdit && <SkillsEdit skills={p.skills} trigger="edit" />}>
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
          ) : (
            canEdit && <EmptyCard text="Add the skills you bring to a team"><SkillsEdit skills={[]} trigger="button" /></EmptyCard>
          )}

          {hasInterests ? (
            <Card title="Interests & Goals" action={canEdit && <InterestsEdit profile={p} trigger="edit" />}>
              <div className="space-y-4">
                {p.goals.length > 0 && <div><h3 className={groupLabel}>Looking for</h3><Chips items={p.goals} /></div>}
                {p.interests.length > 0 && <div><h3 className={groupLabel}>Interested in</h3><Chips items={p.interests} /></div>}
                {p.looking_for.length > 0 && <div><h3 className={groupLabel}>Wants to team up with</h3><Chips items={p.looking_for} /></div>}
              </div>
            </Card>
          ) : (
            canEdit && <EmptyCard text="Add what you're interested in and looking for"><InterestsEdit profile={p} trigger="button" /></EmptyCard>
          )}

          {projects.length > 0 ? (
            <Card title="Projects" action={canEdit && <ProjectEdit trigger="add" />}>
              <div className={dividedList}>
                {projects.map((project) => (
                  <ProjectItem key={project.id} project={project} edit={canEdit && <ProjectEdit project={project} trigger="edit" />} />
                ))}
              </div>
            </Card>
          ) : (
            canEdit && <EmptyCard text="Add one thing you built, even a small one"><ProjectEdit trigger="button" /></EmptyCard>
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

        {/* Scrolls on its own when taller than the screen, so its last cards stay reachable while it sticks */}
        <aside className="space-y-4 lg:sticky lg:top-20 lg:max-h-[calc(100dvh-6rem)] lg:overflow-y-auto">

          {canEdit && (
            <Card title="Your profile">
              <ProfileCompletion profile={p} />
            </Card>
          )}

          {canEdit && !hasContact ? (
            <EmptyCard text="Add Telegram or email for your connections"><ContactEdit contact={contact} trigger="button" /></EmptyCard>
          ) : (
            contact && (
              <Card title="Contact" note={canEdit ? "Only visible to your connections" : undefined} action={canEdit && <ContactEdit contact={contact} trigger="edit" />}>
                {!hasContact && <p className={`text-sm ${muted}`}>No contact details added yet.</p>}
                <dl className="space-y-2 text-sm">
                  {contact.telegram && (
                    <div className="flex gap-3">
                      <dt className={`w-20 shrink-0 ${muted}`}>Telegram</dt>
                      <dd className="min-w-0"><a href={`https://t.me/${encodeURIComponent(contact.telegram)}`} target="_blank" rel="noreferrer" className={`break-all ${textLink}`}>t.me/{contact.telegram}</a></dd>
                    </div>
                  )}
                  {contact.email && (
                    <div className="flex gap-3">
                      <dt className={`w-20 shrink-0 ${muted}`}>Email</dt>
                      <dd className="min-w-0"><a href={`mailto:${contact.email}`} className={`break-all ${textLink}`}>{contact.email}</a></dd>
                    </div>
                  )}
                </dl>
              </Card>
            )
          )}

          {links.length > 0 ? (
            <Card title="Links" action={canEdit && <LinksEdit profile={p} trigger="edit" />}>
              <ul className="space-y-3 text-sm">
                {links.map((l) => (
                  <li key={l.label}>
                    <a href={l.href} target="_blank" rel="noreferrer" className="flex items-center gap-3 hover:opacity-80">
                      <span className={muted}>{l.icon}</span>
                      <span className="min-w-0">
                        <span className="block font-medium">{l.label}</span>
                        <span className={`block truncate text-xs ${muted}`}>{l.href.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "")}</span>
                      </span>
                    </a>
                  </li>
                ))}
              </ul>
            </Card>
          ) : (
            canEdit && <EmptyCard text="Add your GitHub, LinkedIn or website"><LinksEdit profile={p} trigger="button" /></EmptyCard>
          )}

          {connections.length > 0 && (
            <Card title={`${connections.length} ${connections.length === 1 ? "connection" : "connections"}`}>
              <ConnectionList people={connections.slice(0, shownConnections)} />
              {connections.length > shownConnections && (
                <details className="group mt-4">
                  <summary className={`cursor-pointer list-none text-sm group-open:hidden ${textLink}`}>See all</summary>
                  <ConnectionList people={connections.slice(shownConnections)} />
                </details>
              )}
            </Card>
          )}

          {suggestions.length > 0 && (
            <Card title="People you may team up with">
              <ul className={dividedList}>
                {suggestions.map((s) => (
                  <li key={s.id} className="flex items-center gap-3">
                    <Link href={`/u/${s.id}`} className="flex min-w-0 flex-1 items-center gap-3 hover:opacity-80">
                      <Avatar url={s.avatar_url} name={s.name} className="h-10 w-10 text-sm" sizes="40px" />
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-medium">{s.name}</span>
                        {s.headline && <span className={`block truncate text-xs ${muted}`}>{s.headline}</span>}
                      </span>
                    </Link>
                    {s.connect}
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </aside>
      </div>
    </ToastProvider>
  );
}
