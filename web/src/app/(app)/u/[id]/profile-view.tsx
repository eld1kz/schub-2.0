import type { ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { mediaUrl, webLink, type Experience, type Project } from "@/lib/portfolio";
import { byRank, type Award } from "@/lib/awards";
import { skillEvidence } from "@/lib/skills";
import { workStyleLine } from "@/lib/languages";
import { ProfileCompletion } from "../../profile/completion";
import { About } from "./about";
import type { AwardOptions } from "./award-fields";
import { AwardsSection, HeroAward, PendingTags, Placement } from "./awards";
import { CopyLinkButton } from "./copy-link";
import { OpenToTeamSwitch } from "./open-to-team-switch";
import { ExperienceEntry, KeyValue, SideBlock, SkillRows } from "./profile-parts";
import { AboutEdit, ContactEdit, ExperienceEdit, HeroEdit, InterestsEdit, LinksEdit, ProjectEdit, SkillsEdit } from "./section-edits";
import type { SharedProject } from "@/lib/shared-projects";
import { HideButton, PendingSharedProjects, SharedProjectBody, ShowAgainButton } from "./shared-projects";
import { Avatar, Chip, ChipList, EmptyState, Section, Timeline, ToastProvider } from "@/components/ui";

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
  // Roles they'd join a team as (lib/roles.ts); shown while open_to_collaborate is on
  wanted_roles: string[];
  // Work style (lib/languages.ts); empty when not given
  languages: string[];
  hours_per_week: string;
  work_mode: string;
  city: string;
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
  // Their own awards and the ones they confirmed as a teammate, newest first
  awards: Award[];
  // Tags waiting on you, on your own page
  pendingAwards: Award[];
  awardOptions: AwardOptions;
  // Team projects this profile confirmed (lib/shared-projects.ts); `hidden` ones only come on your own page
  sharedProjects: { project: SharedProject; hidden: boolean }[];
  // Team projects waiting for your answer, on your own page
  pendingShared: SharedProject[];
  experiences: Experience[];
  // `built`: the title of what the team built, when it's on this profile
  teams: { id: string; title: string; role: string; built?: string }[];
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

// `award` is the best award linked to this project; it takes the place of the typed-in result
function ProjectItem({ project: p, award, edit }: { project: Project; award?: Award; edit?: ReactNode }) {
  const image = mediaUrl(p.image_url);
  const live = webLink(p.url);
  const code = webLink(p.repo_url);
  const where = [p.role, p.built_at && `Built at ${p.built_at}`, p.year].filter(Boolean).join(" · ");
  return (
    <article id={`project-${p.id}`} className="flex flex-col gap-2 border-b border-border pb-6 [&+&]:pt-6 sm:[&+&]:pt-6">
      <div className="flex items-baseline justify-between gap-4">
        <h3 className="text-lg font-semibold tracking-snug">{p.title}</h3>
        <div className="flex shrink-0 items-center gap-2">
          {award ? (
            <a href={`#award-${award.id}`} title={award.opportunity?.title ?? award.event_name} className="hover:opacity-80">
              <Placement placement={award.placement} />
            </a>
          ) : (
            p.result && <span className="text-right text-meta font-semibold text-accent sm:text-sm">{p.result}</span>
          )}
          {edit && <span className="-my-2">{edit}</span>}
        </div>
      </div>
      {p.tagline && <p className="max-w-prose text-sm leading-normal sm:text-base">{p.tagline}</p>}
      {where && <p className="text-meta text-ink2 sm:text-sm">{where}</p>}
      {p.description && <p className="line-clamp-3 max-w-prose text-sm leading-normal whitespace-pre-wrap text-ink2">{p.description}</p>}
      {image && (
        <div className="relative mt-1 aspect-photo w-60 overflow-hidden rounded-md border border-border">
          <Image src={image} alt="" fill sizes="240px" className="object-cover" />
        </div>
      )}
      {(p.skills.length > 0 || live || code) && (
        <div className="mt-1 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
          <ChipList>
            {p.skills.map((s) => <Chip key={s}>{s}</Chip>)}
          </ChipList>
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
            <Avatar url={c.avatar_url} name={c.name} size="md" />
          </Link>
        </li>
      ))}
    </ul>
  );
}

export function ProfileView({ id, profile: p, canEdit, owner, action, contact, projects, awards, pendingAwards, awardOptions, sharedProjects, pendingShared, experiences, teams, events, ideas, connections, suggestions }: Props) {
  const links = [
    { label: "GitHub", href: webLink(p.github) },
    { label: "LinkedIn", href: webLink(p.linkedin) },
    { label: "Website", href: webLink(p.website) },
  ].flatMap((l) => (l.href ? [{ ...l, href: l.href }] : []));
  const workStyle = workStyleLine(p);
  const education = [p.university, p.graduation_year ? `Class of ${p.graduation_year}` : ""].filter(Boolean).join(" · ");
  const skillGroups = skillEvidence(p.skills, projects, experiences);
  const hasInterests = p.interests.length > 0 || p.goals.length > 0 || p.looking_for.length > 0;
  const hasContact = Boolean(contact?.telegram || contact?.email);
  // Experiences arrive with current roles first
  const currentRole = experiences.find((e) => !e.end_date);
  const ranked = [...awards].sort(byRank);
  // A project shows the best of its owner's awards that link to it
  const projectAward = (projectId: string) => ranked.find((a) => a.user_id === id && a.project_id === projectId);
  // Your own projects plus the team projects you confirmed
  const projectCount = projects.length + sharedProjects.length;

  return (
    <ToastProvider>
      {owner && <OwnerBanner id={id} preview={owner.preview} />}
      {pendingAwards.length > 0 && <PendingTags awards={pendingAwards} />}
      {pendingShared.length > 0 && <PendingSharedProjects projects={pendingShared} />}
      <div className="lg:grid lg:grid-cols-sidebar lg:items-start lg:gap-20">
        <div>
          <header className="relative grid grid-cols-media items-center gap-x-4 gap-y-3 pb-8 sm:grid-rows-auto-fill sm:items-start sm:gap-x-8 sm:gap-y-2">
            <Avatar url={p.avatar_url} name={p.name} size="profile" className="border border-border sm:row-span-2" priority square ring={p.open_to_collaborate ? "open" : null} />
            <h1 className={`text-2xl leading-tight font-semibold tracking-tight sm:text-3xl sm:tracking-tighter ${canEdit ? "pr-8" : ""}`}>
              {p.name || "Unnamed"}
            </h1>
            <div className="col-span-2 flex flex-col gap-2 sm:col-span-1 sm:col-start-2">
              {p.headline && <p className="text-lg leading-snug text-pretty text-ink2 sm:text-xl">{p.headline}</p>}
              {ranked[0] && <HeroAward award={ranked[0]} />}
              {(currentRole || education) && (
                <p className="flex flex-wrap gap-x-4 gap-y-1.5 text-sm text-ink2 sm:mt-1 sm:text-base">
                  {currentRole && <span className="font-semibold text-foreground">{currentRole.role} at {currentRole.company}</span>}
                  {education && <span>{education}</span>}
                </p>
              )}
              {p.open_to_collaborate && p.wanted_roles.length > 0 && (
                <p className="text-sm sm:text-base">
                  <span className="text-muted">Open to:</span> <span className="font-medium">{p.wanted_roles.join(", ")}</span>
                </p>
              )}
              {canEdit && p.open_to_collaborate && p.wanted_roles.length === 0 && (
                <p className="text-sm text-muted">Open to: pick the roles you&apos;d join as in Edit intro</p>
              )}
              {workStyle && <p className="text-sm text-ink2 sm:text-base">{workStyle}</p>}
              <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-3 sm:mt-4">
                {canEdit ? (
                  <OpenToTeamSwitch open={p.open_to_collaborate} />
                ) : (
                  <>
                    {action}
                    <CopyLinkButton path={`/u/${id}`} />
                    {p.open_to_collaborate && (
                      <span className="flex items-center gap-2 text-sm font-medium">
                        <span aria-hidden className="h-2 w-2 rounded-full bg-open" />
                        Open to a team
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
                <div className="max-w-prose text-base leading-relaxed text-pretty"><About text={p.bio} /></div>
              ) : (
                <EmptyState title="Write a few lines about you" action={<AboutEdit bio="" trigger="button" />}>
                  What you like building, what you&apos;re good at, and what kind of team you want to join.
                </EmptyState>
              )}
            </Section>
          )}

          {(experiences.length > 0 || canEdit) && (
            <Section title="Experience" quiet={experiences.length === 0} owner={canEdit} add={canEdit && experiences.length > 0 && <ExperienceEdit trigger="link" />}>
              {experiences.length > 0 ? (
                <Timeline>
                  {experiences.map((e) => (
                    <ExperienceEntry key={e.id} experience={e} edit={canEdit && <ExperienceEdit experience={e} trigger="edit" />} />
                  ))}
                </Timeline>
              ) : (
                <EmptyState title="Add your experience" action={<ExperienceEdit trigger="button" />}>
                  Internships, club roles, TA positions, research. Team leads check this first when reviewing a request to join.
                </EmptyState>
              )}
            </Section>
          )}

          <AwardsSection awards={awards} profileId={id} canEdit={canEdit} options={awardOptions} />

          {(skillGroups.length > 0 || canEdit) && (
            <Section title="Skills" quiet={skillGroups.length === 0} owner={canEdit} editOnHover edit={canEdit && skillGroups.length > 0 && <SkillsEdit skills={p.skills} trigger="edit" />}>
              {skillGroups.length > 0 ? (
                <SkillRows groups={skillGroups} />
              ) : (
                <EmptyState title="Add your skills" action={<SkillsEdit skills={[]} trigger="button" />}>
                  The skills you bring to a team. They decide who you get matched with.
                </EmptyState>
              )}
            </Section>
          )}

          {(hasInterests || canEdit) && (
            <Section title="Interests" quiet={!hasInterests} owner={canEdit} editOnHover edit={canEdit && hasInterests && <InterestsEdit profile={p} trigger="edit" />}>
              {hasInterests ? (
                <div className="flex max-w-prose flex-col gap-2">
                  {p.interests.length > 0 && <p className="text-base leading-relaxed text-pretty">{p.interests.join(" · ")}</p>}
                  {p.goals.length > 0 && <p className="text-sm text-ink2 sm:text-base">Looking for: {p.goals.join(", ")}</p>}
                  {p.looking_for.length > 0 && <p className="text-sm text-ink2 sm:text-base">Team up with: {p.looking_for.join(", ")}</p>}
                </div>
              ) : (
                <EmptyState title="Add interests and goals" action={<InterestsEdit profile={p} trigger="button" />}>
                  What you&apos;re into, and what you&apos;re on Schub for: a hackathon team, a cofounder, a side project.
                </EmptyState>
              )}
            </Section>
          )}

          {(projectCount > 0 || canEdit) && (
            <Section
              title="Projects"
              count={projectCount || undefined}
              quiet={projectCount === 0}
              owner={canEdit}
              add={canEdit && projectCount > 0 && <ProjectEdit trigger="link" />}
            >
              {projectCount > 0 ? (
                <div className="flex flex-col">
                  {projects.map((project) => (
                    <ProjectItem key={project.id} project={project} award={projectAward(project.id)} edit={canEdit && <ProjectEdit project={project} trigger="edit" />} />
                  ))}
                  {sharedProjects.map(({ project: s, hidden }) => (
                    <article key={s.id} id={`shared-${s.id}`} className={`border-b border-border pb-6 [&+&]:pt-6 sm:[&+&]:pt-6 ${hidden ? "opacity-60" : ""}`}>
                      <SharedProjectBody
                        project={s}
                        award={ranked.find((a) => a.team_id === s.team_id)}
                        except={id}
                        edit={canEdit && (hidden ? <ShowAgainButton projectId={s.id} /> : <HideButton projectId={s.id} />)}
                      />
                      {hidden && <p className="mt-2 text-meta text-muted">Hidden from your profile</p>}
                    </article>
                  ))}
                </div>
              ) : (
                <EmptyState title="Add a project" action={<ProjectEdit trigger="button" />}>
                  One thing you built, even a small one: an app, a design, a pitch, a research paper.
                </EmptyState>
              )}
            </Section>
          )}

          {(teams.length > 0 || events.length > 0) && (
            <Section title="On Schub" owner={canEdit}>
              <div className="flex flex-col text-sm sm:text-base">
                {teams.map((t) => (
                  <Link key={t.id} href={`/teams/${t.id}`} className="flex items-baseline justify-between gap-4 border-b border-border py-2 first:pt-0 hover:text-accent">
                    <span>
                      <span className="font-medium">{t.title}</span>
                      {t.built && <span className="text-ink2"> · Built {t.built}</span>}
                    </span>
                    <span className="shrink-0 text-ink2">{t.role}</span>
                  </Link>
                ))}
                {events.map((e) => (
                  <Link key={e.id} href={`/opportunities/${e.id}`} className="flex items-baseline justify-between gap-4 border-b border-border py-2 first:pt-0 hover:text-accent">
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
                    <div className="flex flex-wrap items-baseline gap-x-2">
                      <h3 className="text-lg font-semibold">{idea.title}</h3>
                      <span className="font-mono text-xs font-medium text-muted uppercase">{idea.stage}</span>
                    </div>
                    {idea.description && <p className="max-w-prose text-sm leading-normal whitespace-pre-wrap sm:text-base">{idea.description}</p>}
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
                {canEdit && <p className="-mt-1.5 text-meta text-muted">Only visible to your connections</p>}
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
                <Link href="/people/requests" className={`text-sm font-medium ${outLink}`}>
                  {owner.requests} pending {owner.requests === 1 ? "request" : "requests"}
                </Link>
              )}
            </SideBlock>
          )}

          {suggestions.length > 0 && (
            <SideBlock title="People you may team up with">
              <ul className="flex flex-col gap-4">
                {suggestions.map((s) => (
                  <li key={s.id} className="grid grid-cols-fill-auto items-center gap-3">
                    <Link href={`/u/${s.id}`} className="flex min-w-0 items-center gap-3 hover:opacity-80">
                      {/* Suggestions are all open to a team */}
                      <Avatar url={s.avatar_url} name={s.name} size="lg" ring="open" />
                      <span className="min-w-0">
                        <span className="block truncate text-base font-semibold">{s.name}</span>
                        {s.headline && <span className="block truncate text-meta text-ink2">{s.headline}</span>}
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
