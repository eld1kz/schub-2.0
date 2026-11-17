import Link from "next/link";
import { requireUser } from "@/lib/supabase/server";
import { updateProfile } from "@/app/actions";
import { knownSkills } from "@/lib/skills";
import { SkillPicker } from "./skill-picker";
import { ProfileCompletion } from "./completion";
import { SignInPrompt } from "../sign-in";

export default async function ProfilePage(props: PageProps<"/profile">) {
  const { error } = await props.searchParams;
  const { supabase, userId, isGuest } = await requireUser();
  if (isGuest) return <SignInPrompt text="Sign in to create your profile. It stays with your Google account on every device." />;
  const [{ data: p }, { data: contacts }] = await Promise.all([
    supabase
      .from("profiles")
      .select("name, headline, university, graduation_year, bio, skills, interests, looking_for, open_to_collaborate, github, linkedin, website, avatar_url")
      .eq("id", userId)
      .single(),
    supabase.rpc("contact_for", { profile_id: userId }),
  ]);
  if (!p) return <p className="text-sm text-muted">Profile not found.</p>;
  const contact = (contacts as { telegram: string; email: string }[] | null)?.[0];

  return (
    <form action={updateProfile} className="max-w-md space-y-10">
      <div className="space-y-4">
        <div className="flex items-baseline justify-between">
          <h1 className="text-lg font-semibold">Edit profile</h1>
          <Link href={`/u/${userId}`} className="text-sm text-muted underline hover:text-foreground">View profile</Link>
        </div>
        <ProfileCompletion profile={p} />
      </div>

      <section className="space-y-4">
        <div><label className="label" htmlFor="name">Name</label><input id="name" name="name" defaultValue={p.name} required className="input" /></div>
        <div><label className="label" htmlFor="headline">Headline</label><input id="headline" name="headline" defaultValue={p.headline} maxLength={100} placeholder="CS student building a campus marketplace" className="input" /></div>
        <div><label className="label" htmlFor="photo">Photo (JPG, PNG or WebP, up to 4 MB)</label><input id="photo" name="photo" type="file" accept="image/jpeg,image/png,image/webp" className="input" /></div>
        <div className="flex gap-3">
          <div className="flex-1"><label className="label" htmlFor="university">University</label><input id="university" name="university" defaultValue={p.university} className="input" /></div>
          <div className="w-28"><label className="label" htmlFor="graduation_year">Grad year</label><input id="graduation_year" name="graduation_year" type="number" defaultValue={p.graduation_year || ""} className="input" /></div>
        </div>
        <div><label className="label" htmlFor="bio">About</label><textarea id="bio" name="bio" rows={4} defaultValue={p.bio} className="input" /></div>
      </section>

      <section className="space-y-4">
        <h2 className="text-sm font-medium">Skills</h2>
        <div><label className="label" htmlFor="skills">Skills</label><SkillPicker id="skills" defaultValue={knownSkills(p.skills)} /></div>
        <div><label className="label" htmlFor="interests">Interests, comma separated</label><input id="interests" name="interests" defaultValue={p.interests.join(", ")} placeholder="fintech, education" className="input" /></div>
        <div><label className="label" htmlFor="looking_for">Who you want to team up with, comma separated</label><input id="looking_for" name="looking_for" defaultValue={p.looking_for.join(", ")} placeholder="designer, backend developer" className="input" /></div>
      </section>

      <section className="space-y-4">
        <div>
          <h2 className="text-sm font-medium">Links</h2>
          <p className="mt-1 text-sm text-muted">Shown on your profile to everyone.</p>
        </div>
        <div><label className="label" htmlFor="github">GitHub</label><input id="github" name="github" defaultValue={p.github} placeholder="username or link" className="input" /></div>
        <div><label className="label" htmlFor="linkedin">LinkedIn</label><input id="linkedin" name="linkedin" defaultValue={p.linkedin} placeholder="username or link" className="input" /></div>
        <div><label className="label" htmlFor="website">Website</label><input id="website" name="website" defaultValue={p.website} placeholder="https://" className="input" /></div>
      </section>

      <section className="space-y-4">
        <div>
          <h2 className="text-sm font-medium">How to reach you</h2>
          <p className="mt-1 text-sm text-muted">Only people you&apos;re connected with or on a team with can see these.</p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="flex-1"><label className="label" htmlFor="telegram">Telegram username</label><input id="telegram" name="telegram" defaultValue={contact?.telegram} maxLength={32} placeholder="username" className="input" /></div>
          <div className="flex-1"><label className="label" htmlFor="email">Contact email</label><input id="email" name="email" type="email" defaultValue={contact?.email} maxLength={254} className="input" /></div>
        </div>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="open_to_collaborate" defaultChecked={p.open_to_collaborate} /> Open to collaborate</label>
      </section>

      <p className="text-sm text-muted">Projects and experience are added from your profile page.</p>
      {typeof error === "string" && <p className="text-sm text-red-600">{error}</p>}
      <button className="btn">Save profile</button>
    </form>
  );
}
