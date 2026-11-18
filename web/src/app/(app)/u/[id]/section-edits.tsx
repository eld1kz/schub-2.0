import type { ReactNode } from "react";
import { deleteExperience, deleteProject, saveAbout, saveContact, saveExperience, saveHero, saveInterests, saveLinks, saveProject, saveSkills } from "@/app/actions";
import { GOALS } from "@/lib/goals";
import { knownSkills } from "@/lib/skills";
import type { Experience, Project } from "@/lib/portfolio";
import { Avatar } from "../../avatar";
import { SkillPicker } from "../../profile/skill-picker";
import { EditDialog } from "./edit-dialog";
import { PhotoField } from "./photo-field";
import { GitHubIcon, LinkedInIcon, WebsiteIcon } from "./link-icons";
import type { ProfileData } from "./profile-view";

// The owner's edit modals, one per profile section. Each saves only its own fields.

type Trigger = "edit" | "add" | "button";

const input = "w-full rounded-lg border border-zinc-200 bg-transparent px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none dark:border-zinc-700";

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
    <label className="flex cursor-pointer items-center justify-between gap-4 text-sm">
      {label}
      <input type="checkbox" name={name} defaultChecked={defaultChecked} className="peer sr-only" />
      <span
        aria-hidden
        className="relative h-6 w-11 shrink-0 rounded-full bg-zinc-300 transition-colors peer-checked:bg-indigo-600 peer-focus-visible:ring-2 peer-focus-visible:ring-indigo-500 after:absolute after:top-0.5 after:left-0.5 after:h-5 after:w-5 after:rounded-full after:bg-white after:transition-transform peer-checked:after:translate-x-5 dark:bg-zinc-700"
      />
    </label>
  );
}

function LinkField({ name, label, icon, defaultValue, placeholder }: { name: string; label: string; icon: ReactNode; defaultValue: string; placeholder: string }) {
  return (
    <label className="relative block">
      <span className="sr-only">{label}</span>
      <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-zinc-500 dark:text-zinc-400">{icon}</span>
      <input name={name} defaultValue={defaultValue} placeholder={placeholder} className={`${input} pl-10`} />
    </label>
  );
}

export function HeroEdit({ profile: p }: { profile: ProfileData }) {
  return (
    <EditDialog title="Edit intro" trigger="edit" label="Edit intro" save={saveHero}>
      <div className="flex gap-4">
        <PhotoField current={<Avatar url={p.avatar_url} name={p.name} className="h-20 w-20 text-2xl" sizes="80px" />} />
        <div className="min-w-0 flex-1 space-y-3">
          <Field label="Name"><input name="name" defaultValue={p.name} required className={`${input} text-base font-semibold`} /></Field>
          <Field label="Headline"><input name="headline" defaultValue={p.headline} maxLength={100} placeholder="CS student building a campus marketplace" className={input} /></Field>
        </div>
      </div>
      <div className="grid grid-cols-4 gap-3">
        <Field label="University" className="col-span-3"><input name="university" defaultValue={p.university} className={input} /></Field>
        <Field label="Grad year"><input name="graduation_year" type="number" defaultValue={p.graduation_year || ""} className={input} /></Field>
      </div>
      <Toggle name="open_to_collaborate" label="Open to collaborate" defaultChecked={p.open_to_collaborate} />
    </EditDialog>
  );
}

export function AboutEdit({ bio, trigger }: { bio: string; trigger: Trigger }) {
  return (
    <EditDialog title="Edit about" trigger={trigger} label="Edit about" save={saveAbout}>
      <Field label="About you"><textarea name="bio" rows={6} defaultValue={bio} className={`${input} resize-none`} /></Field>
    </EditDialog>
  );
}

export function SkillsEdit({ skills, trigger }: { skills: string[]; trigger: Trigger }) {
  return (
    <EditDialog title="Edit skills" trigger={trigger} label="Edit skills" save={saveSkills}>
      <label htmlFor="skill-search" className="sr-only">Skills</label>
      <SkillPicker id="skill-search" defaultValue={knownSkills(skills)} />
    </EditDialog>
  );
}

export function InterestsEdit({ profile: p, trigger }: { profile: ProfileData; trigger: Trigger }) {
  return (
    <EditDialog title="Edit interests & goals" trigger={trigger} label="Edit interests and goals" save={saveInterests}>
      <Field label="Interests, comma separated"><input name="interests" defaultValue={p.interests.join(", ")} placeholder="fintech, education" className={input} /></Field>
      <fieldset>
        <legend className="label">What you&apos;re looking for</legend>
        <div className="grid grid-cols-2 gap-2">
          {GOALS.map((g) => (
            <label
              key={g}
              className="flex cursor-pointer items-center justify-center rounded-full border border-zinc-200 px-3 py-2 text-center text-sm text-muted transition-colors hover:border-zinc-400 has-[:checked]:border-indigo-500 has-[:checked]:bg-indigo-50 has-[:checked]:text-indigo-700 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-indigo-500 dark:border-zinc-700 dark:has-[:checked]:bg-indigo-950 dark:has-[:checked]:text-indigo-300"
            >
              <input type="checkbox" name="goals" value={g} defaultChecked={p.goals.includes(g)} className="sr-only" />
              {g}
            </label>
          ))}
        </div>
      </fieldset>
      <Field label="Who you want to team up with"><input name="looking_for" defaultValue={p.looking_for.join(", ")} placeholder="designer, backend developer" className={input} /></Field>
    </EditDialog>
  );
}

export function LinksEdit({ profile: p, trigger }: { profile: ProfileData; trigger: Trigger }) {
  return (
    <EditDialog title="Edit links" trigger={trigger} label="Edit links" save={saveLinks}>
      <p className="text-xs text-muted">Visible to everyone</p>
      <div className="space-y-2">
        <LinkField name="github" label="GitHub" icon={<GitHubIcon />} defaultValue={p.github} placeholder="GitHub username or link" />
        <LinkField name="linkedin" label="LinkedIn" icon={<LinkedInIcon />} defaultValue={p.linkedin} placeholder="LinkedIn username or link" />
        <LinkField name="website" label="Website" icon={<WebsiteIcon />} defaultValue={p.website} placeholder="https://" />
      </div>
    </EditDialog>
  );
}

export function ContactEdit({ contact, trigger }: { contact?: { telegram: string; email: string }; trigger: Trigger }) {
  return (
    <EditDialog title="Edit contact" trigger={trigger} label="Edit contact" save={saveContact}>
      <p className="text-xs text-muted">Only visible to your connections</p>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Telegram username"><input name="telegram" defaultValue={contact?.telegram} maxLength={32} placeholder="username" className={input} /></Field>
        <Field label="Contact email"><input name="email" type="email" defaultValue={contact?.email} maxLength={254} className={input} /></Field>
      </div>
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
    >
      <p className="text-sm text-muted">Internships, jobs, student clubs, research, volunteering.</p>
      <Field label="Role"><input name="role" defaultValue={e?.role} required maxLength={80} placeholder="Frontend intern" className={input} /></Field>
      <Field label="Where"><input name="company" defaultValue={e?.company} required maxLength={80} placeholder="Kaspi.kz" className={input} /></Field>
      <div className="flex gap-3">
        <Field label="Started" className="min-w-0 flex-1"><input name="start" type="month" defaultValue={e?.start_date.slice(0, 7)} required className={input} /></Field>
        <Field label="Ended" className="min-w-0 flex-1"><input name="end" type="month" defaultValue={e?.end_date?.slice(0, 7)} className={input} /></Field>
      </div>
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="current" defaultChecked={e ? !e.end_date : false} /> I&apos;m still doing this</label>
      <Field label="What you did"><textarea name="description" rows={4} defaultValue={e?.description} maxLength={600} className={input} /></Field>
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
      <p className="text-sm text-muted">Something you built or helped build: an app, a design, a pitch, a research paper.</p>
      <Field label="Name"><input name="title" defaultValue={p?.title} required maxLength={80} className={input} /></Field>
      <Field label="One line about it"><input name="tagline" defaultValue={p?.tagline} maxLength={140} placeholder="Swap used textbooks with students on your campus" className={input} /></Field>
      <Field label={p?.image_url ? "Image (choose a file to replace the current one)" : "Image"}><input name="image" type="file" accept="image/jpeg,image/png,image/webp" className={input} /></Field>
      <div className="flex gap-3">
        <Field label="Your role" className="flex-1"><input name="role" defaultValue={p?.role} maxLength={60} placeholder="Frontend and design" className={input} /></Field>
        <Field label="Year" className="w-28"><input name="year" type="number" min={2000} max={2100} defaultValue={p?.year ?? ""} className={input} /></Field>
      </div>
      <div className="flex flex-col gap-3 sm:flex-row">
        <Field label="Built at (optional)" className="flex-1"><input name="built_at" defaultValue={p?.built_at} maxLength={100} placeholder="HackNU 2026" className={input} /></Field>
        <Field label="Result (optional)" className="flex-1"><input name="result" defaultValue={p?.result} maxLength={60} placeholder="2nd place" className={input} /></Field>
      </div>
      <Field label="What it does and what you did"><textarea name="description" rows={4} defaultValue={p?.description} maxLength={600} className={input} /></Field>
      <div>
        <label htmlFor="project-skill-search" className="label">Skills used</label>
        <SkillPicker id="project-skill-search" defaultValue={knownSkills(p?.skills ?? [])} />
      </div>
      <Field label="Link to it"><input name="url" defaultValue={p?.url} placeholder="https://" className={input} /></Field>
      <Field label="Link to the code"><input name="repo_url" defaultValue={p?.repo_url} placeholder="https://github.com/..." className={input} /></Field>
    </EditDialog>
  );
}
