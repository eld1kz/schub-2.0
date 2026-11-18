import type { ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { formatPeriod, mediaUrl, webLink, type Experience, type Project } from "@/lib/portfolio";
import { groupSkills } from "@/lib/skills";
import { Avatar } from "../../avatar";
import { ProfileCompletion } from "../../profile/completion";
import { About } from "./about";
import { CopyLinkButton } from "./copy-link";
import { ChipTable, EmptyPrompt, KeyValue, OrgMark, Section, SideBlock } from "./profile-parts";
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
  // Set on your own page: whether you're previewing it as a visitor, and connection requests waiting on you
  owner?: { preview: boolean; requests: number };
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
const outLink = "text-accent hover:underline";
// Links show without "https://www." and the trailing slash
const bare = (href: string) => href.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "");

function OwnerBanner({ id, preview }: { id: string; preview: boolean }) {
  return (
    <div className="-mt-8 mb-8 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 border-b border-border py-3 text-center text-sm text-ink2 sm:-mt-12 sm:mb-12">
      <span>{preview ? "You're seeing your profile the way visitors do." : "This is your profile. Visitors don't see edit controls or empty sections."}</span>
      <Link href={preview ? `/u/${id}` : `/u/${id}?as=visitor`} className="font-semibold text-accent hover:underline">
        {preview ? "Back to editing" : "View as visitor"}
      </Link>
    </div>
  );
}

function ProjectItem({ project: p, edit }: { project: Project; edit?: ReactNode }) {
  const image = mediaUrl(p.image_url);
  const live = webLink(p.url);
  const code = webLink(p.repo_url);
  const where = [p.role, p.built_at && `Built at ${p.built_at}`, p.year].filter(Boolean).join(" · ");
  return (
    <article className="flex flex-col gap-2 border-b border-border pb-6 sm:pb-7 [&+&]:pt-6 sm:[&+&]:pt-7">
      <div className="flex items-baseline justify-between gap-4">
        <h3 className="text-[17px] font-semibold tracking-[-0.01em] sm:text-[19px]">{p.title}</h3>
        <div className="flex shrink-0 items-center gap-2">
          {p.result && <span className="text-right text-[13px] font-semibold text-accent sm:text-sm">{p.result}</span>}
          {edit && <span className="-my-2">{edit}</span>}
        </div>
      </div>
      {p.tagline && <p className="max-w-[600px] text-sm leading-normal sm:text-[15px]">{p.tagline}</p>}
      {where && <p className="text-[13px] text-ink2 sm:text-sm">{where}</p>}
      {p.description && <p className="line-clamp-3 max-w-[600px] text-sm leading-normal whitespace-pre-wrap text-ink2">{p.description}</p>}
      {image && (
        <div className="relative mt-1 aspect-[3/2] w-60 overflow-hidden rounded-md border border-border">
          <Image src={image} alt="" fill sizes="240px" className="object-cover" />
        </div>
      )}
      {(p.skills.length > 0 || live || code) && (
        <div className="mt-1 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
          <ul className="flex flex-wrap gap-1.5">
            {p.skills.map((s) => <li key={s} className="skill px-1.5 text-xs">{s}</li>)}
          </ul>
          {(live || code) && (
            <p className="flex gap-4 text-sm font-medium">
              {live && <a href={live} target="_blank" rel="noreferrer" className={outLink}>Live ↗</a>}
              {code && <a href={code} target="_blank" rel="noreferrer" className={outLink}>Code ↗</a>}
            </p>
          )}
        </div>
      )}
    </article>
  );
}

function ConnectionStack({ people }: { people: Connection[] }) {
  return (
    <ul className="flex">
      {people.map((c) => (
        <li key={c.id} className="-mr-1.5">
          <Link href={`/u/${c.id}`} title={c.name || "Unnamed"} className="block rounded-full border-2 border-background hover:opacity-80">
            <Avatar url={c.avatar_url} name={c.name} className="h-8 w-8 text-[11px]" sizes="32px" />
          </Link>
        </li>
      ))}
    </ul>
  );
}

export function ProfileView({ id, profile: p, canEdit, owner, action, contact, projects, experiences, teams, events, ideas, connections, suggestions }: Props) {
  const links = [
    { label: "GitHub", href: webLink(p.github) },
    { label: "LinkedIn", href: webLink(p.linkedin) },
    { label: "Website", href: webLink(p.website) },
  ].flatMap((l) => (l.href ? [{ ...l, href: l.href }] : []));
  const education = [p.university, p.graduation_year ? `Class of ${p.graduation_year}` : ""].filter(Boolean).join(" · ");
  const skillGroups = groupSkills(p.skills).map((g) => ({ name: g.name, items: g.skills }));
  const interestRows = [
    { name: "Looking for", items: p.goals },
    { name: "Interested in", items: p.interests },
    { name: "Team up with", items: p.looking_for },
  ].filter((r) => r.items.length > 0);
  const hasContact = Boolean(contact?.telegram || contact?.email);
  // Experiences arrive with current roles first
  const currentRole = experiences.find((e) => !e.end_date);

  return (
    <ToastProvider>
      {owner && <OwnerBanner id={id} preview={owner.preview} />}
      <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_296px] lg:items-start lg:gap-20">
        <div>
          <header className="relative grid grid-cols-[72px_minmax(0,1fr)] items-center gap-x-4 gap-y-3.5 pb-8 sm:grid-cols-[120px_minmax(0,1fr)] sm:grid-rows-[auto_1fr] sm:items-start sm:gap-x-8 sm:gap-y-2.5 sm:pb-10">
            <Avatar url={p.avatar_url} name={p.name} className="h-[72px] w-[72px] border border-border text-xl sm:row-span-2 sm:h-[120px] sm:w-[120px] sm:text-3xl" sizes="(min-width: 640px) 120px, 72px" priority square />
            <h1 className={`text-[28px] leading-[1.1] font-semibold tracking-[-0.02em] sm:text-[44px] sm:leading-[1.05] sm:tracking-[-0.03em] ${canEdit ? "pr-10" : ""}`}>
              {p.name || "Unnamed"}
            </h1>
            <div className="col-span-2 flex flex-col gap-2.5 sm:col-span-1 sm:col-start-2">
              {p.headline && <p className="text-[17px] leading-[1.4] text-pretty text-ink2 sm:text-xl">{p.headline}</p>}
              {(currentRole || education) && (
                <p className="flex flex-wrap gap-x-[18px] gap-y-1.5 text-sm text-ink2 sm:mt-1 sm:text-[15px]">
                  {currentRole && <span className="font-semibold text-foreground">{currentRole.role} at {currentRole.company}</span>}
                  {education && <span>{education}</span>}
                </p>
              )}
              <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-3 sm:mt-4">
                {canEdit ? (
                  <span className="flex items-center gap-2.5">
                    <span className="flex h-[34px] items-center gap-2 rounded-md border border-line2 px-3 text-sm font-medium">
                      <span aria-hidden className={`h-2 w-2 rounded-full ${p.open_to_collaborate ? "bg-accent" : "bg-line2"}`} />
                      {p.open_to_collaborate ? "Open to collaborate" : "Not open to collaborate"}
                    </span>
                    <span className="hidden text-sm text-muted sm:inline">Shown on your profile and in team search</span>
                  </span>
                ) : (
                  <>
                    {action}
                    <CopyLinkButton path={`/u/${id}`} />
                    {p.open_to_collaborate && (
                      <span className="flex items-center gap-2 text-sm font-medium">
                        <span aria-hidden className="h-2 w-2 rounded-full bg-accent" />
                        Open to collaborate
                      </span>
                    )}
                  </>
                )}
              </div>
            </div>
            {canEdit && (
              <div className="absolute top-0 right-0 rounded-md border border-line2">
                <HeroEdit profile={p} />
              </div>
            )}
          </header>

          {(p.bio || canEdit) && (
            <Section title="About" quiet={!p.bio} owner={canEdit} edit={canEdit && p.bio && <AboutEdit bio={p.bio} trigger="edit" />}>
              {p.bio ? (
                <div className="max-w-[620px] text-[15px] leading-relaxed text-pretty sm:text-base sm:leading-[1.65]"><About text={p.bio} /></div>
              ) : (
                <EmptyPrompt title="Write a few lines about you" text="What you like building, what you're good at, and what kind of team you want to join.">
                  <AboutEdit bio="" trigger="button" />
                </EmptyPrompt>
              )}
            </Section>
          )}

          {(experiences.length > 0 || canEdit) && (
            <Section title="Experience" quiet={experiences.length === 0} owner={canEdit} add={canEdit && experiences.length > 0 && <ExperienceEdit trigger="link" />}>
              {experiences.length > 0 ? (
                <div className="flex flex-col gap-5 sm:gap-7">
                  {experiences.map((e) => (
                    <article key={e.id} className="grid grid-cols-[36px_minmax(0,1fr)] gap-3 sm:grid-cols-[44px_minmax(0,1fr)] sm:gap-4">
                      <OrgMark name={e.company} />
                      <div className="flex flex-col gap-0.5 sm:gap-[3px]">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
                            <h3 className="text-[15px] font-semibold sm:text-[17px]">{e.role}</h3>
                            {!e.end_date && <span className="rounded-[3px] border border-accent px-1.5 font-mono text-[11px] font-medium text-accent">CURRENT</span>}
                          </div>
                          {canEdit && <span className="-my-1.5"><ExperienceEdit experience={e} trigger="edit" /></span>}
                        </div>
                        <p className="text-sm text-ink2 sm:text-[15px]">{[e.company, e.type].filter(Boolean).join(" · ")}</p>
                        <p className="text-[13px] text-muted tabular-nums sm:text-sm">
                          {[formatPeriod(e.start_date, e.end_date), e.location, e.remote && "Remote"].filter(Boolean).join(" · ")}
                        </p>
                        {e.description && <p className="mt-2 max-w-[600px] text-sm leading-normal whitespace-pre-wrap sm:text-[15px]">{e.description}</p>}
                        {e.skills.length > 0 && (
                          <ul className="mt-2 flex flex-wrap gap-1.5">
                            {e.skills.map((s) => <li key={s} className="skill px-1.5 text-xs">{s}</li>)}
                          </ul>
                        )}
                      </div>
                    </article>
                  ))}
                </div>
              ) : (
                <EmptyPrompt title="Add your experience" text="Internships, club roles, TA positions, research. Team leads check this first when reviewing a request to join.">
                  <ExperienceEdit trigger="button" />
                </EmptyPrompt>
              )}
            </Section>
          )}

          {(skillGroups.length > 0 || canEdit) && (
            <Section title="Skills" quiet={skillGroups.length === 0} owner={canEdit} edit={canEdit && skillGroups.length > 0 && <SkillsEdit skills={p.skills} trigger="edit" />}>
              {skillGroups.length > 0 ? (
                <ChipTable rows={skillGroups} mono />
              ) : (
                <EmptyPrompt title="Add your skills" text="The skills you bring to a team. They decide who you get matched with.">
                  <SkillsEdit skills={[]} trigger="button" />
                </EmptyPrompt>
              )}
            </Section>
          )}

          {(interestRows.length > 0 || canEdit) && (
            <Section title="Interests" quiet={interestRows.length === 0} owner={canEdit} edit={canEdit && interestRows.length > 0 && <InterestsEdit profile={p} trigger="edit" />}>
              {interestRows.length > 0 ? (
                <ChipTable rows={interestRows} />
              ) : (
                <EmptyPrompt title="Add interests and goals" text="What you're into, and what you're on Schub for: a hackathon team, a cofounder, a side project.">
                  <InterestsEdit profile={p} trigger="button" />
                </EmptyPrompt>
              )}
            </Section>
          )}

          {(projects.length > 0 || canEdit) && (
            <Section
              title="Projects"
              count={projects.length || undefined}
              quiet={projects.length === 0}
              owner={canEdit}
              add={canEdit && projects.length > 0 && <ProjectEdit trigger="link" />}
            >
              {projects.length > 0 ? (
                <div className="flex flex-col">
                  {projects.map((project) => (
                    <ProjectItem key={project.id} project={project} edit={canEdit && <ProjectEdit project={project} trigger="edit" />} />
                  ))}
                </div>
              ) : (
                <EmptyPrompt title="Add a project" text="One thing you built, even a small one: an app, a design, a pitch, a research paper.">
                  <ProjectEdit trigger="button" />
                </EmptyPrompt>
              )}
            </Section>
          )}

          {(teams.length > 0 || events.length > 0) && (
            <Section title="On Schub" owner={canEdit}>
              <div className="flex flex-col text-sm sm:text-[15px]">
                {teams.map((t) => (
                  <Link key={t.id} href={`/teams/${t.id}`} className="flex items-baseline justify-between gap-4 border-b border-border py-2.5 first:pt-0 hover:text-accent">
                    <span className="font-medium">{t.title}</span>
                    <span className="shrink-0 text-ink2">{t.role}</span>
                  </Link>
                ))}
                {events.map((e) => (
                  <Link key={e.id} href={`/opportunities/${e.id}`} className="flex items-baseline justify-between gap-4 border-b border-border py-2.5 first:pt-0 hover:text-accent">
                    <span className="font-medium">{e.title}</span>
                    <span className="shrink-0 text-ink2">Looking for a team</span>
                  </Link>
                ))}
              </div>
            </Section>
          )}

          {ideas.length > 0 && (
            <Section title="Ideas" count={ideas.length} owner={canEdit}>
              <div className="flex flex-col gap-6">
                {ideas.map((idea) => (
                  <article key={idea.id} className="flex flex-col gap-1.5">
                    <div className="flex flex-wrap items-baseline gap-x-2.5">
                      <h3 className="text-[17px] font-semibold">{idea.title}</h3>
                      <span className="font-mono text-[11px] font-medium text-muted uppercase">{idea.stage}</span>
                    </div>
                    {idea.description && <p className="max-w-[600px] text-sm leading-normal whitespace-pre-wrap sm:text-[15px]">{idea.description}</p>}
                    {idea.skills_needed.length > 0 && <p className="text-sm text-ink2">Needs {idea.skills_needed.join(", ")}</p>}
                  </article>
                ))}
              </div>
            </Section>
          )}
        </div>

        {/* Below lg it follows the main column, under a rule */}
        <aside className="flex flex-col border-t border-line2 pt-6 lg:border-t-0 lg:pt-0">
          {canEdit && (
            <SideBlock title="Your profile">
              <ProfileCompletion profile={p} />
            </SideBlock>
          )}

          {links.length > 0 ? (
            <SideBlock title="Links" edit={canEdit && <LinksEdit profile={p} trigger="edit" />}>
              {links.map((l) => (
                <KeyValue key={l.label} label={l.label}>
                  <a href={l.href} target="_blank" rel="noreferrer" className={outLink}>{bare(l.href)}</a>
                </KeyValue>
              ))}
            </SideBlock>
          ) : (
            canEdit && (
              <SideBlock title="Links" quiet>
                <p className="text-sm leading-normal text-ink2">Add GitHub, LinkedIn or a website so teams can see your work.</p>
                <LinksEdit profile={p} trigger="link" />
              </SideBlock>
            )
          )}

          {canEdit && !hasContact ? (
            <SideBlock title="Contact" quiet>
              <p className="text-sm leading-normal text-ink2">Add Telegram or email. Only your connections see it.</p>
              <ContactEdit contact={contact} trigger="link" />
            </SideBlock>
          ) : (
            contact && (
              <SideBlock title="Contact" edit={canEdit && <ContactEdit contact={contact} trigger="edit" />}>
                {canEdit && <p className="-mt-1.5 text-[13px] text-muted">Only visible to your connections</p>}
                {!hasContact && <p className="text-sm text-ink2">No contact details added yet.</p>}
                {contact.telegram && (
                  <KeyValue label="Telegram">
                    <a href={`https://t.me/${encodeURIComponent(contact.telegram)}`} target="_blank" rel="noreferrer" className={outLink}>t.me/{contact.telegram}</a>
                  </KeyValue>
                )}
                {contact.email && (
                  <KeyValue label="Email">
                    <a href={`mailto:${contact.email}`} className={outLink}>{contact.email}</a>
                  </KeyValue>
                )}
              </SideBlock>
            )
          )}

          {(connections.length > 0 || (owner && owner.requests > 0)) && (
            <SideBlock title="Connections" aside={connections.length}>
              {connections.length > 0 && <ConnectionStack people={connections.slice(0, shownConnections)} />}
              {connections.length > shownConnections && (
                <details className="group">
                  <summary className={`cursor-pointer list-none text-sm font-medium group-open:hidden ${outLink}`}>See all</summary>
                  <ul className="flex flex-col gap-2 text-sm">
                    {connections.slice(shownConnections).map((c) => (
                      <li key={c.id}><Link href={`/u/${c.id}`} className="hover:text-accent">{c.name || "Unnamed"}</Link></li>
                    ))}
                  </ul>
                </details>
              )}
              {owner && !owner.preview && owner.requests > 0 && (
                <Link href="/people" className={`text-sm font-medium ${outLink}`}>
                  {owner.requests} pending {owner.requests === 1 ? "request" : "requests"}
                </Link>
              )}
            </SideBlock>
          )}

          {suggestions.length > 0 && (
            <SideBlock title="People you may team up with">
              <ul className="flex flex-col gap-4">
                {suggestions.map((s) => (
                  <li key={s.id} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
                    <Link href={`/u/${s.id}`} className="flex min-w-0 items-center gap-3 hover:opacity-80">
                      <Avatar url={s.avatar_url} name={s.name} className="h-10 w-10 text-[13px]" sizes="40px" />
                      <span className="min-w-0">
                        <span className="block truncate text-[15px] font-semibold">{s.name}</span>
                        {s.headline && <span className="block truncate text-[13px] text-ink2">{s.headline}</span>}
                      </span>
                    </Link>
                    {s.connect}
                  </li>
                ))}
              </ul>
            </SideBlock>
          )}
        </aside>
      </div>
    </ToastProvider>
  );
}
