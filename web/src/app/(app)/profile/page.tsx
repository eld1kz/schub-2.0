import { requireUser } from "@/lib/supabase/server";
import { updateProfile } from "@/app/actions";

export default async function ProfilePage() {
  const { supabase, userId } = await requireUser();
  const { data: p } = await supabase.from("profiles").select("*").eq("id", userId).single();
  if (!p) return <p className="text-sm text-muted">Profile not found.</p>;

  return (
    <form action={updateProfile} className="max-w-md space-y-4">
      <h1 className="text-lg font-semibold">Your profile</h1>
      <div><label className="label" htmlFor="name">Name</label><input id="name" name="name" defaultValue={p.name} required className="input" /></div>
      <div className="flex gap-3">
        <div className="flex-1"><label className="label" htmlFor="university">University</label><input id="university" name="university" defaultValue={p.university} className="input" /></div>
        <div className="w-28"><label className="label" htmlFor="graduation_year">Grad year</label><input id="graduation_year" name="graduation_year" type="number" defaultValue={p.graduation_year || ""} className="input" /></div>
      </div>
      <div><label className="label" htmlFor="bio">Bio</label><textarea id="bio" name="bio" rows={3} defaultValue={p.bio} className="input" /></div>
      <div><label className="label" htmlFor="skills">Skills, comma separated</label><input id="skills" name="skills" defaultValue={p.skills.join(", ")} placeholder="swift, design, marketing" className="input" /></div>
      <div><label className="label" htmlFor="interests">Interests, comma separated</label><input id="interests" name="interests" defaultValue={p.interests.join(", ")} placeholder="fintech, education" className="input" /></div>
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="open_to_collaborate" defaultChecked={p.open_to_collaborate} /> Open to collaborate</label>
      <button className="btn">Save</button>
    </form>
  );
}
