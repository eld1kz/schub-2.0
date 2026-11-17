import { notFound } from "next/navigation";
import { requireUser } from "@/lib/supabase/server";
import { deleteProject, saveProject } from "@/app/actions";
import { projectColumns, type Project } from "@/lib/portfolio";
import { knownSkills } from "@/lib/skills";
import { SignInPrompt } from "../../../sign-in";
import { SkillPicker } from "../../skill-picker";

// /profile/projects/new adds a project; /profile/projects/<id> edits one of your own
export default async function ProjectFormPage(props: PageProps<"/profile/projects/[id]">) {
  const [{ id }, { error }] = await Promise.all([props.params, props.searchParams]);
  const { supabase, userId, isGuest } = await requireUser();
  if (isGuest) return <SignInPrompt text="Sign in to add projects to your profile." />;
  const isNew = id === "new";
  const { data } = isNew ? { data: null } : await supabase.from("projects").select(projectColumns).eq("id", id).eq("user_id", userId).maybeSingle();
  const p = data as Project | null;
  if (!isNew && !p) notFound();

  return (
    <div className="max-w-md space-y-6">
      <form action={saveProject.bind(null, isNew ? null : id)} className="space-y-4">
        <div>
          <h1 className="text-lg font-semibold">{isNew ? "Add a project" : "Edit project"}</h1>
          <p className="mt-1 text-sm text-muted">Something you built or helped build: an app, a design, a pitch, a research paper.</p>
        </div>
        <div><label className="label" htmlFor="title">Name</label><input id="title" name="title" defaultValue={p?.title} required maxLength={80} className="input" /></div>
        <div><label className="label" htmlFor="tagline">One line about it</label><input id="tagline" name="tagline" defaultValue={p?.tagline} maxLength={140} placeholder="Swap used textbooks with students on your campus" className="input" /></div>
        <div><label className="label" htmlFor="image">Image{p?.image_url ? " (choose a file to replace the current one)" : ""}</label><input id="image" name="image" type="file" accept="image/jpeg,image/png,image/webp" className="input" /></div>
        <div className="flex gap-3">
          <div className="flex-1"><label className="label" htmlFor="role">Your role</label><input id="role" name="role" defaultValue={p?.role} maxLength={60} placeholder="Frontend and design" className="input" /></div>
          <div className="w-28"><label className="label" htmlFor="year">Year</label><input id="year" name="year" type="number" min={2000} max={2100} defaultValue={p?.year ?? ""} className="input" /></div>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="flex-1"><label className="label" htmlFor="built_at">Built at (optional)</label><input id="built_at" name="built_at" defaultValue={p?.built_at} maxLength={100} placeholder="HackNU 2026" className="input" /></div>
          <div className="flex-1"><label className="label" htmlFor="result">Result (optional)</label><input id="result" name="result" defaultValue={p?.result} maxLength={60} placeholder="2nd place" className="input" /></div>
        </div>
        <div><label className="label" htmlFor="description">What it does and what you did</label><textarea id="description" name="description" rows={4} defaultValue={p?.description} maxLength={600} className="input" /></div>
        <div><label className="label" htmlFor="skills">Skills used</label><SkillPicker id="skills" defaultValue={knownSkills(p?.skills ?? [])} /></div>
        <div><label className="label" htmlFor="url">Link to it</label><input id="url" name="url" defaultValue={p?.url} placeholder="https://" className="input" /></div>
        <div><label className="label" htmlFor="repo_url">Link to the code</label><input id="repo_url" name="repo_url" defaultValue={p?.repo_url} placeholder="https://github.com/…" className="input" /></div>
        {typeof error === "string" && <p className="text-sm text-red-600">{error}</p>}
        <button className="btn">{isNew ? "Add project" : "Save project"}</button>
      </form>
      {!isNew && (
        <form action={deleteProject.bind(null, id)}><button className="text-sm text-muted hover:text-foreground">Delete project</button></form>
      )}
    </div>
  );
}
