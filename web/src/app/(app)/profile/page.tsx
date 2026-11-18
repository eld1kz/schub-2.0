import type { ReactNode } from "react";
import Link from "next/link";
import { requireUser } from "@/lib/supabase/server";
import { updateProfile } from "@/app/actions";
import { knownSkills } from "@/lib/skills";
import { experienceColumns, type Experience } from "@/lib/portfolio";
import { SkillPicker } from "./skill-picker";
import { ProfileCompletion } from "./completion";
import { ExperienceDeleteForms, ExperienceList } from "./experience-list";
import { GOALS } from "@/lib/goals";
import { SignInPrompt } from "../sign-in";
import { Avatar } from "../avatar";
import { Card, PageBackground } from "../card";
import { GitHubIcon, LinkedInIcon, WebsiteIcon } from "../u/[id]/link-icons";

// Inputs on this page only; the rest of the site keeps the shared .input style
const base = "w-full rounded-lg border border-zinc-200 bg-transparent px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:outline-none dark:border-zinc-700";
const field = `${base} text-sm`;

// A link input with its site's icon inside on the left
function LinkField({ id, label, icon, defaultValue, placeholder }: { id: string; label: string; icon: ReactNode; defaultValue: string; placeholder: string }) {
  return (
    <div className="relative">
      <label htmlFor={id} className="sr-only">{label}</label>
      <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-muted">{icon}</span>
      <input id={id} name={id} defaultValue={defaultValue} placeholder={placeholder} className={`${field} pl-10`} />
    </div>
  );
}

export const instant = false;

export default async function ProfilePage(props: PageProps<"/profile">) {
  const { error } = await props.searchParams;
  const { supabase, userId, isGuest } = await requireUser();
  if (isGuest) return <SignInPrompt text="Sign in to create your profile. It stays with your Google account on every device." />;
  const [{ data: p }, { data: contacts }, { data: experienceRows }] = await Promise.all([
    supabase
      .from("profiles")
      .select("name, headline, university, graduation_year, bio, skills, interests, looking_for, goals, open_to_collaborate, github, linkedin, website, avatar_url")
      .eq("id", userId)
      .single(),
    supabase.rpc("contact_for", { profile_id: userId }),
    supabase.from("experiences").select(experienceColumns).eq("user_id", userId).order("start_date", { ascending: false }),
  ]);
  if (!p) return <p className="text-sm text-muted">Profile not found.</p>;
  const contact = (contacts as { telegram: string; email: string }[] | null)?.[0];
  const experiences = (experienceRows ?? []) as unknown as Experience[];

  return (
    <>
      <PageBackground />
      <form action={updateProfile}>
        <div className="mb-6 flex items-baseline justify-between gap-4">
          <h1 className="text-2xl font-bold">Edit profile</h1>
          <Link href={`/u/${userId}`} className="text-sm text-muted underline hover:text-foreground">View profile</Link>
        </div>

        <div className="space-y-4">
          <ProfileCompletion profile={p} />

          <Card>
            <div className="flex gap-4">
              {/* The whole circle opens the file picker */}
              <label className="group flex w-20 shrink-0 cursor-pointer flex-col items-center gap-1.5 rounded-lg text-center has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-indigo-500">
                <Avatar url={p.avatar_url} name={p.name} className="h-20 w-20 text-2xl transition-opacity group-hover:opacity-80" sizes="80px" />
                <span className="text-xs text-zinc-500 dark:text-zinc-400">Click to upload photo</span>
                <input id="photo" name="photo" type="file" accept="image/jpeg,image/png,image/webp" aria-label="Photo (JPG, PNG or WebP, up to 4 MB)" className="sr-only" />
              </label>
              <div className="min-w-0 flex-1 space-y-2">
                <label htmlFor="name" className="sr-only">Name</label>
                <input id="name" name="name" defaultValue={p.name} required placeholder="Your name" className={`${base} text-xl font-semibold`} />
                <label htmlFor="headline" className="sr-only">Headline</label>
                <input id="headline" name="headline" defaultValue={p.headline} maxLength={100} placeholder="CS student building a campus marketplace" className={field} />
              </div>
            </div>
            <div className="mt-4 grid grid-cols-4 gap-3">
              <div className="col-span-3"><label className="label" htmlFor="university">University</label><input id="university" name="university" defaultValue={p.university} className={field} /></div>
              <div><label className="label" htmlFor="graduation_year">Grad year</label><input id="graduation_year" name="graduation_year" type="number" defaultValue={p.graduation_year || ""} className={field} /></div>
            </div>
          </Card>

          <Card title="About">
            <label htmlFor="bio" className="sr-only">About</label>
            <textarea id="bio" name="bio" rows={4} defaultValue={p.bio} className={`${field} resize-none`} />
          </Card>

          <Card title="Experience">
            <ExperienceList experiences={experiences} />
          </Card>

          <Card title="Skills">
            <label htmlFor="skills" className="sr-only">Skills</label>
            <SkillPicker id="skills" defaultValue={knownSkills(p.skills)} />
          </Card>

          <Card title="Interests & Goals">
            <div className="space-y-4">
              <div><label className="label" htmlFor="interests">Interests, comma separated</label><input id="interests" name="interests" defaultValue={p.interests.join(", ")} placeholder="fintech, education" className={field} /></div>
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
              <div><label className="label" htmlFor="looking_for">Who you want to team up with</label><input id="looking_for" name="looking_for" defaultValue={p.looking_for.join(", ")} placeholder="designer, backend developer" className={field} /></div>
              <label className="flex cursor-pointer items-center justify-between gap-4 text-sm">
                Open to collaborate
                <input type="checkbox" name="open_to_collaborate" defaultChecked={p.open_to_collaborate} className="peer sr-only" />
                <span
                  aria-hidden
                  className="relative h-6 w-11 shrink-0 rounded-full bg-zinc-300 transition-colors peer-checked:bg-indigo-600 peer-focus-visible:ring-2 peer-focus-visible:ring-indigo-500 after:absolute after:top-0.5 after:left-0.5 after:h-5 after:w-5 after:rounded-full after:bg-white after:transition-transform peer-checked:after:translate-x-5 dark:bg-zinc-700"
                />
              </label>
            </div>
          </Card>

          <Card title="Links" note="Visible to everyone">
            <div className="space-y-2">
              <LinkField id="github" label="GitHub" icon={<GitHubIcon />} defaultValue={p.github} placeholder="GitHub username or link" />
              <LinkField id="linkedin" label="LinkedIn" icon={<LinkedInIcon />} defaultValue={p.linkedin} placeholder="LinkedIn username or link" />
              <LinkField id="website" label="Website" icon={<WebsiteIcon />} defaultValue={p.website} placeholder="https://" />
            </div>
          </Card>

          <Card title="Contact" note="Only visible to your connections">
            <div className="grid gap-3 sm:grid-cols-2">
              <div><label className="label" htmlFor="telegram">Telegram username</label><input id="telegram" name="telegram" defaultValue={contact?.telegram} maxLength={32} placeholder="username" className={field} /></div>
              <div><label className="label" htmlFor="email">Contact email</label><input id="email" name="email" type="email" defaultValue={contact?.email} maxLength={254} className={field} /></div>
            </div>
          </Card>

          <p className="text-sm text-muted">Projects are added from your profile page.</p>
          {typeof error === "string" && <p className="text-sm text-red-600">{error}</p>}
          <button className="w-full rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600">Save changes</button>
        </div>
      </form>
      <ExperienceDeleteForms experiences={experiences} />
    </>
  );
}
