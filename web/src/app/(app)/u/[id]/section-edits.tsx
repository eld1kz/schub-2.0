import type { ReactNode } from "react";
import { deleteAward, deleteExperience, deleteProject, saveAbout, saveAward, saveContact, saveExperience, saveHero, saveInterests, saveLinks, saveProject, saveSkills } from "@/app/actions";
import { placementLabel, type Award } from "@/lib/awards";
import { GOALS } from "@/lib/goals";
import { ROLES } from "@/lib/roles";
import { knownSkills } from "@/lib/skills";
import type { Experience, Project } from "@/lib/portfolio";
import { Avatar } from "../../avatar";
import { SkillPicker } from "../../profile/skill-picker";
import { AwardFields, type AwardOptions } from "./award-fields";
import { EditDialog } from "./edit-dialog";
import { PhotoField } from "./photo-field";
import { ExperienceFields } from "./experience-fields";
import { GitHubIcon, LinkedInIcon, WebsiteIcon } from "./link-icons";
import type { ProfileData } from "./profile-view";

// The owner's edit modals, one per profile section. Each saves only its own fields.

type Trigger = "edit" | "link" | "button";

// Checkbox chips in a grid, like the goals and roles pickers
const chipOption = "flex cursor-pointer items-center justify-center rounded-md border border-line2 px-3 py-2 text-center text-sm text-ink2 transition-colors hover:border-muted has-[:checked]:border-accent has-[:checked]:bg-accent-soft has-[:checked]:text-accent has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-accent";

// A labelled row of fields: the label sits in its own column from sm up
function Group({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="space-y-3 border-b border-border py-5 last:border-b-0 sm:grid sm:grid-cols-[120px_minmax(0,1fr)] sm:gap-6 sm:space-y-0 sm:py-6">
      <div className="text-[13px] font-semibold text-ink2 sm:pt-2 sm:text-sm sm:text-foreground">{label}</div>
      <div className="min-w-0 space-y-3.5">{children}</div>
    </div>
  );
}

function Field({ label, className = "", children }: { label: string; className?: string; children: ReactNode }) {
  return (
    <label className={`block ${className}`}>
      <span className="label">{label}</span>
      {children}
    </label>
  );
}

function Toggle({ name, label, defaultChecked }: { name: string; label: string; defaultChecked: boolean }) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-4 text-[15px]">
      {label}
      <input type="checkbox" name={name} defaultChecked={defaultChecked} className="peer sr-only" />
      <span
        aria-hidden
        className="relative h-[26px] w-11 shrink-0 rounded-full bg-line2 transition-colors peer-checked:bg-accent peer-focus-visible:ring-2 peer-focus-visible:ring-accent peer-focus-visible:ring-offset-2 after:absolute after:top-[3px] after:left-[3px] after:h-5 after:w-5 after:rounded-full after:bg-background after:transition-transform peer-checked:after:translate-x-[18px]"
      />
    </label>
  );
}

function LinkField({ name, label, icon, defaultValue, placeholder }: { name: string; label: string; icon: ReactNode; defaultValue: string; placeholder: string }) {
  return (
    <label className="relative block">
      <span className="sr-only">{label}</span>
      <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-muted">{icon}</span>
      <input name={name} defaultValue={defaultValue} placeholder={placeholder} className="input pl-10" />
    </label>
  );
}

export function HeroEdit({ profile: p }: { profile: ProfileData }) {
  return (
    <EditDialog title="Edit intro" trigger="edit" label="Edit intro" save={saveHero}>
      <Group label="Intro">
        <div className="flex gap-4">
          <PhotoField current={<Avatar url={p.avatar_url} name={p.name} className="h-20 w-20 text-2xl" sizes="80px" square />} />
          <div className="min-w-0 flex-1 space-y-3.5">
            <Field label="Name"><input name="name" defaultValue={p.name} required maxLength={80} className="input font-semibold" /></Field>
            <Field label="Headline"><input name="headline" defaultValue={p.headline} maxLength={100} placeholder="CS student building a campus marketplace" className="input" /></Field>
          </div>
        </div>
      </Group>
      <Group label="School">
        <div className="grid grid-cols-[minmax(0,1fr)_7rem] gap-3">
          <Field label="University"><input name="university" defaultValue={p.university} maxLength={120} className="input" /></Field>
          <Field label="Grad year"><input name="graduation_year" type="number" defaultValue={p.graduation_year || ""} className="input" /></Field>
        </div>
      </Group>
      <Group label="Open to a team">
        <Toggle name="open_to_collaborate" label="Open to a team" defaultChecked={p.open_to_collaborate} />
        <p className="text-[13px] text-ink2">A green ring on your photo, and team owners can find you in People</p>
        <fieldset>
          <legend className="label">Roles you&apos;d join as (shown while you&apos;re open to a team)</legend>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {ROLES.map((r) => (
              <label key={r} className={chipOption}>
                <input type="checkbox" name="wanted_roles" value={r} defaultChecked={p.wanted_roles.includes(r)} className="sr-only" />
                {r}
              </label>
            ))}
          </div>
        </fieldset>
      </Group>
    </EditDialog>
  );
}

export function AboutEdit({ bio, trigger }: { bio: string; trigger: Trigger }) {
  return (
    <EditDialog title="Edit about" trigger={trigger} label="Edit about" cta="Write about you" save={saveAbout}>
      <Group label="About">
        <Field label="About you"><textarea name="bio" rows={6} defaultValue={bio} maxLength={2000} className="input resize-none leading-normal" /></Field>
      </Group>
    </EditDialog>
  );
}

export function SkillsEdit({ skills, trigger }: { skills: string[]; trigger: Trigger }) {
  return (
    <EditDialog title="Edit skills" trigger={trigger} label="Edit skills" cta="Add skills" save={saveSkills}>
      <Group label="Skills">
        <label htmlFor="skill-search" className="sr-only">Skills</label>
        <SkillPicker id="skill-search" defaultValue={knownSkills(skills)} />
      </Group>
    </EditDialog>
  );
}

export function InterestsEdit({ profile: p, trigger }: { profile: ProfileData; trigger: Trigger }) {
  return (
    <EditDialog title="Edit interests & goals" trigger={trigger} label="Edit interests and goals" cta="Add interests" save={saveInterests}>
      <Group label="Looking for">
        <fieldset>
          <legend className="sr-only">What you&apos;re looking for</legend>
          <div className="grid grid-cols-2 gap-2">
            {GOALS.map((g) => (
              <label key={g} className={chipOption}>
                <input type="checkbox" name="goals" value={g} defaultChecked={p.goals.includes(g)} className="sr-only" />
                {g}
              </label>
            ))}
          </div>
        </fieldset>
      </Group>
      <Group label="Interests">
        <Field label="Comma separated"><input name="interests" defaultValue={p.interests.join(", ")} maxLength={500} placeholder="fintech, education" className="input" /></Field>
      </Group>
      <Group label="Team up with">
        <Field label="Who you want to work with"><input name="looking_for" defaultValue={p.looking_for.join(", ")} maxLength={500} placeholder="designer, backend developer" className="input" /></Field>
      </Group>
    </EditDialog>
  );
}

export function LinksEdit({ profile: p, trigger }: { profile: ProfileData; trigger: Trigger }) {
  return (
    <EditDialog title="Edit links" trigger={trigger} label="Edit links" cta="Add links" note="Visible to everyone" save={saveLinks}>
      <Group label="Links">
        <LinkField name="github" label="GitHub" icon={<GitHubIcon />} defaultValue={p.github} placeholder="GitHub username or link" />
        <LinkField name="linkedin" label="LinkedIn" icon={<LinkedInIcon />} defaultValue={p.linkedin} placeholder="LinkedIn username or link" />
        <LinkField name="website" label="Website" icon={<WebsiteIcon />} defaultValue={p.website} placeholder="https://" />
      </Group>
    </EditDialog>
  );
}

export function ContactEdit({ contact, trigger }: { contact?: { telegram: string; email: string }; trigger: Trigger }) {
  return (
    <EditDialog title="Edit contact" trigger={trigger} label="Edit contact" cta="Add contact" note="Only visible to your connections" save={saveContact}>
      <Group label="Contact">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Telegram username"><input name="telegram" defaultValue={contact?.telegram} maxLength={32} placeholder="username" className="input" /></Field>
          <Field label="Contact email"><input name="email" type="email" defaultValue={contact?.email} maxLength={254} className="input" /></Field>
        </div>
      </Group>
    </EditDialog>
  );
}

// No `experience` adds a new entry
export function ExperienceEdit({ experience: e, trigger }: { experience?: Experience; trigger: Trigger }) {
  return (
    <EditDialog
      title={e ? "Edit experience" : "Add experience"}
      trigger={trigger}
      label={e ? `Edit ${e.role}` : "Add experience"}
      save={saveExperience.bind(null, e?.id ?? null)}
      remove={e && deleteExperience.bind(null, e.id)}
      tall
      requireValid
    >
      <ExperienceFields experience={e} />
    </EditDialog>
  );
}

// No `award` adds a new one
export function AwardEdit({ award: a, options, trigger }: { award?: Award; options: AwardOptions; trigger: Trigger }) {
  return (
    <EditDialog
      title={a ? "Edit award" : "Add award"}
      trigger={trigger}
      label={a ? `Edit ${placementLabel(a.placement)}, ${a.event_name}` : "Add award"}
      save={saveAward.bind(null, a?.id ?? null)}
      remove={a && deleteAward.bind(null, a.id)}
      tall
      requireValid
    >
      <AwardFields award={a} {...options} />
    </EditDialog>
  );
}

// No `project` adds a new one
export function ProjectEdit({ project: p, trigger }: { project?: Project; trigger: Trigger }) {
  return (
    <EditDialog
      title={p ? "Edit project" : "Add project"}
      trigger={trigger}
      label={p ? `Edit ${p.title}` : "Add project"}
      save={saveProject.bind(null, p?.id ?? null)}
      remove={p && deleteProject.bind(null, p.id)}
    >
      <Group label="Project">
        <Field label="Name"><input name="title" defaultValue={p?.title} required maxLength={80} className="input" /></Field>
        <Field label="One line about it"><input name="tagline" defaultValue={p?.tagline} maxLength={140} placeholder="Swap used textbooks with students on your campus" className="input" /></Field>
        <Field label={p?.image_url ? "Image (choose a file to replace the current one)" : "Image"}><input name="image" type="file" accept="image/jpeg,image/png,image/webp" className="input" /></Field>
      </Group>
      <Group label="Your part">
        <div className="grid grid-cols-[minmax(0,1fr)_7rem] gap-3">
          <Field label="Your role"><input name="role" defaultValue={p?.role} maxLength={60} placeholder="Frontend and design" className="input" /></Field>
          <Field label="Year"><input name="year" type="number" min={2000} max={2100} defaultValue={p?.year ?? ""} className="input" /></Field>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Built at (optional)"><input name="built_at" defaultValue={p?.built_at} maxLength={100} placeholder="HackNU 2026" className="input" /></Field>
          <Field label="Result (optional)"><input name="result" defaultValue={p?.result} maxLength={60} placeholder="2nd place" className="input" /></Field>
        </div>
      </Group>
      <Group label="Details">
        <Field label="What it does and what you did"><textarea name="description" rows={4} defaultValue={p?.description} maxLength={600} className="input leading-normal" /></Field>
        <div>
          <label htmlFor="project-skill-search" className="label">Skills used</label>
          <SkillPicker id="project-skill-search" defaultValue={knownSkills(p?.skills ?? [])} />
        </div>
      </Group>
      <Group label="Links">
        <Field label="Link to it"><input name="url" defaultValue={p?.url} placeholder="https://" className="input" /></Field>
        <Field label="Link to the code"><input name="repo_url" defaultValue={p?.repo_url} placeholder="https://github.com/..." className="input" /></Field>
      </Group>
    </EditDialog>
  );
}
