import { requireUser } from "@/lib/supabase/server";
import { createTeam } from "@/app/actions";
import { today } from "@/lib/opportunities";

export default async function NewTeamPage(props: PageProps<"/teams/new">) {
  const { error, opportunity } = await props.searchParams;
  const { supabase } = await requireUser();
  const day = today();
  const { data: opportunities } = await supabase
    .from("opportunities")
    .select("id, title")
    .eq("status", "live")
    .or(`deadline.gte.${day},starts_at.gte.${day},and(deadline.is.null,starts_at.is.null)`)
    .order("title");

  return (
    <form action={createTeam} className="max-w-md space-y-4">
      <div>
        <h1 className="text-lg font-semibold">Post a team</h1>
        <p className="mt-1 text-sm text-muted">Say what you&apos;re building and which roles you still need. People apply; you accept or decline.</p>
      </div>
      <div><label className="label" htmlFor="title">Project or team name</label><input id="title" name="title" required minLength={3} maxLength={120} className="input" /></div>
      <div><label className="label" htmlFor="description">What are you building?</label><textarea id="description" name="description" rows={4} maxLength={2000} className="input" /></div>
      <div><label className="label" htmlFor="roles">Open roles, comma separated</label><input id="roles" name="roles" required placeholder="Designer, Backend developer, Pitch" className="input" /></div>
      <div>
        <label className="label" htmlFor="opportunity_id">For an opportunity (optional)</label>
        <select id="opportunity_id" name="opportunity_id" defaultValue={typeof opportunity === "string" ? opportunity : ""} className="input">
          <option value="">Not tied to one</option>
          {(opportunities ?? []).map((o) => <option key={o.id} value={o.id}>{o.title}</option>)}
        </select>
      </div>
      {typeof error === "string" && <p className="text-sm text-red-600">{error}</p>}
      <button className="btn">Post</button>
    </form>
  );
}
