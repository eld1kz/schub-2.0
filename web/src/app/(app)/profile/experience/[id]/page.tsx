import { notFound } from "next/navigation";
import { requireUser } from "@/lib/supabase/server";
import { deleteExperience, saveExperience } from "@/app/actions";
import { experienceColumns, type Experience } from "@/lib/portfolio";

// /profile/experience/new adds an entry; /profile/experience/<id> edits one of your own
export default async function ExperienceFormPage(props: PageProps<"/profile/experience/[id]">) {
  const [{ id }, { error }] = await Promise.all([props.params, props.searchParams]);
  const { supabase, userId } = await requireUser();
  const isNew = id === "new";
  const { data } = isNew ? { data: null } : await supabase.from("experiences").select(experienceColumns).eq("id", id).eq("user_id", userId).maybeSingle();
  const e = data as Experience | null;
  if (!isNew && !e) notFound();

  return (
    <div className="max-w-md space-y-6">
      <form action={saveExperience.bind(null, isNew ? null : id)} className="space-y-4">
        <div>
          <h1 className="text-lg font-semibold">{isNew ? "Add experience" : "Edit experience"}</h1>
          <p className="mt-1 text-sm text-muted">Internships, jobs, student clubs, research, volunteering.</p>
        </div>
        <div><label className="label" htmlFor="role">Role</label><input id="role" name="role" defaultValue={e?.role} required maxLength={80} placeholder="Frontend intern" className="input" /></div>
        <div><label className="label" htmlFor="company">Where</label><input id="company" name="company" defaultValue={e?.company} required maxLength={80} placeholder="Kaspi.kz" className="input" /></div>
        <div className="flex gap-3">
          <div className="flex-1"><label className="label" htmlFor="start">Started</label><input id="start" name="start" type="month" defaultValue={e?.start_date.slice(0, 7)} required className="input" /></div>
          <div className="flex-1"><label className="label" htmlFor="end">Ended</label><input id="end" name="end" type="month" defaultValue={e?.end_date?.slice(0, 7)} className="input" /></div>
        </div>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="current" defaultChecked={isNew ? false : !e?.end_date} /> I&apos;m still doing this</label>
        <div><label className="label" htmlFor="description">What you did</label><textarea id="description" name="description" rows={4} defaultValue={e?.description} maxLength={600} className="input" /></div>
        {typeof error === "string" && <p className="text-sm text-red-600">{error}</p>}
        <button className="btn">{isNew ? "Add experience" : "Save experience"}</button>
      </form>
      {!isNew && (
        <form action={deleteExperience.bind(null, id)}><button className="text-sm text-muted hover:text-foreground">Delete experience</button></form>
      )}
    </div>
  );
}
