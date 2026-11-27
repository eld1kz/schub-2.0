import type { ReactNode } from "react";
import { deleteAward, deleteExperience, deleteProject, saveAbout, saveAward, saveContact, saveExperience, saveHero, saveInterests, saveLinks, saveProject, saveSkills } from "@/app/actions";
import { placementLabel, type Award } from "@/lib/awards";
import { GOALS } from "@/lib/goals";
import { ROLES } from "@/lib/roles";
import { HOURS, LANGUAGES, WORK_MODES, workModeLabel } from "@/lib/languages";
import { knownSkills } from "@/lib/skills";
import type { Experience, Project } from "@/lib/portfolio";
import { SkillPicker } from "../../profile/skill-picker";
import { AwardFields, type AwardOptions } from "./award-fields";
import { EditDialog } from "./edit-dialog";
import { PhotoField } from "./photo-field";
import { ExperienceFields } from "./experience-fields";
import { GitHubIcon, LinkedInIcon, WebsiteIcon } from "./link-icons";
import type { ProfileData } from "./profile-view";
import { Avatar, CheckChip, Combobox, FieldLabel, Input, Switch, Textarea } from "@/components/ui";

// The owner's edit modals, one per profile section. Each saves only its own fields.

type Trigger = "edit" | "link" | "button";

// A labelled row of fields: the label sits in its own column from sm up
function Group({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="space-y-3 border-b border-border py-4 last:border-b-0 sm:grid sm:grid-cols-label-sm sm:gap-6 sm:space-y-0 sm:py-6">
      <div className="text-meta font-semibold text-ink2 sm:pt-2 sm:text-sm sm:text-foreground">{label}</div>
      <div className="min-w-0 space-y-3">{children}</div>
    </div>
  );
}

function Field({ label, className = "", children }: { label: string; className?: string; children: ReactNode }) {
  return (
    <label className={`block ${className}`}>
      <FieldLabel as="span" quiet>{label}</FieldLabel>
      {children}
    </label>
  );
}

function LinkField({ name, label, icon, defaultValue, placeholder }: { name: string; label: string; icon: ReactNode; defaultValue: string; placeholder: string }) {
  return (
    <label className="relative block">
      <span className="sr-only">{label}</span>
      <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-muted">{icon}</span>
      <Input name={name} defaultValue={defaultValue} placeholder={placeholder} className="pl-8" />
    </label>
  );
}

export function HeroEdit({ profile: p }: { profile: ProfileData }) {
  return (
    <EditDialog title="Edit intro" trigger="edit" label="Edit intro" save={saveHero}>
      <Group label="Intro">
        <div className="flex gap-4">
          <PhotoField current={<Avatar url={p.avatar_url} name={p.name} size="2xl" square />} />
          <div className="min-w-0 flex-1 space-y-3">
            <Field label="Name"><Input name="name" defaultValue={p.name} required maxLength={80} className="font-semibold" /></Field>
            <Field label="Headline"><Input name="headline" defaultValue={p.headline} maxLength={100} placeholder="CS student building a campus marketplace" /></Field>
          </div>
        </div>
      </Group>
      <Group label="School">
        <div className="grid grid-cols-fill-short gap-3">
          <Field label="University"><Input name="university" defaultValue={p.university} maxLength={120} /></Field>
          <Field label="Grad year"><Input name="graduation_year" type="number" defaultValue={p.graduation_year || ""} /></Field>
        </div>
      </Group>
      <Group label="Work style">
        <fieldset>
          <FieldLabel as="legend" quiet>Languages you work in</FieldLabel>
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
            {LANGUAGES.map((l) => (
              <CheckChip key={l} name="languages" value={l} defaultChecked={p.languages.includes(l)}>{l}</CheckChip>
            ))}
          </div>
        </fieldset>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <FieldLabel as="span" quiet>Hours a week</FieldLabel>
            <Combobox name="hours_per_week" label="Hours a week" defaultValue={p.hours_per_week} placeholder="Not set" required={false} options={HOURS.map((h) => ({ value: h, label: h }))} />
          </div>
          <div>
            <FieldLabel as="span" quiet>Work mode</FieldLabel>
            <Combobox name="work_mode" label="Work mode" defaultValue={p.work_mode} placeholder="Not set" required={false} options={WORK_MODES.map((m) => ({ value: m, label: workModeLabel(m) }))} />
          </div>
        </div>
        <Field label="City"><Input name="city" defaultValue={p.city} maxLength={60} placeholder="Seoul" /></Field>
        <p className="text-meta text-ink2">Everyone can see these, signed out too</p>
      </Group>
      <Group label="Open to a team">
        <Switch name="open_to_collaborate" label="Open to a team" defaultChecked={p.open_to_collaborate} />
        <p className="text-meta text-ink2">A green ring on your photo, and team owners can find you in People</p>
        <fieldset>
          <FieldLabel as="legend" quiet>Roles you&apos;d join as (shown while you&apos;re open to a team)</FieldLabel>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {ROLES.map((r) => (
              <CheckChip key={r} name="wanted_roles" value={r} defaultChecked={p.wanted_roles.includes(r)}>{r}</CheckChip>
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
        <Field label="About you"><Textarea name="bio" rows={6} defaultValue={bio} maxLength={2000} /></Field>
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
              <CheckChip key={g} name="goals" value={g} defaultChecked={p.goals.includes(g)}>{g}</CheckChip>
            ))}
          </div>
        </fieldset>
      </Group>
      <Group label="Interests">
        <Field label="Comma separated"><Input name="interests" defaultValue={p.interests.join(", ")} maxLength={500} placeholder="fintech, education" /></Field>
      </Group>
      <Group label="Team up with">
        <Field label="Who you want to work with"><Input name="looking_for" defaultValue={p.looking_for.join(", ")} maxLength={500} placeholder="designer, backend developer" /></Field>
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
          <Field label="Telegram username"><Input name="telegram" defaultValue={contact?.telegram} maxLength={32} placeholder="username" /></Field>
          <Field label="Contact email"><Input name="email" type="email" defaultValue={contact?.email} maxLength={254} /></Field>
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
        <Field label="Name"><Input name="title" defaultValue={p?.title} required maxLength={80} /></Field>
        <Field label="One line about it"><Input name="tagline" defaultValue={p?.tagline} maxLength={140} placeholder="Swap used textbooks with students on your campus" /></Field>
        <Field label={p?.image_url ? "Image (choose a file to replace the current one)" : "Image"}><Input name="image" type="file" accept="image/jpeg,image/png,image/webp" /></Field>
      </Group>
      <Group label="Your part">
        <div className="grid grid-cols-fill-short gap-3">
          <Field label="Your role"><Input name="role" defaultValue={p?.role} maxLength={60} placeholder="Frontend and design" /></Field>
          <Field label="Year"><Input name="year" type="number" min={2000} max={2100} defaultValue={p?.year ?? ""} /></Field>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Built at (optional)"><Input name="built_at" defaultValue={p?.built_at} maxLength={100} placeholder="HackNU 2026" /></Field>
          <Field label="Result (optional)"><Input name="result" defaultValue={p?.result} maxLength={60} placeholder="2nd place" /></Field>
        </div>
      </Group>
      <Group label="Details">
        <Field label="What it does and what you did"><Textarea name="description" rows={4} defaultValue={p?.description} maxLength={600} /></Field>
        <div>
          <FieldLabel htmlFor="project-skill-search" quiet>Skills used</FieldLabel>
          <SkillPicker id="project-skill-search" defaultValue={knownSkills(p?.skills ?? [])} />
        </div>
      </Group>
      <Group label="Links">
        <Field label="Link to it"><Input name="url" defaultValue={p?.url} placeholder="https://" /></Field>
        <Field label="Link to the code"><Input name="repo_url" defaultValue={p?.repo_url} placeholder="https://github.com/..." /></Field>
      </Group>
    </EditDialog>
  );
}
