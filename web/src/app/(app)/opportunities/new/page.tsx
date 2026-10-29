import { addOpportunity } from "@/app/actions";
import { opportunityTypes } from "@/lib/opportunities";

export default async function NewOpportunityPage(props: PageProps<"/opportunities/new">) {
  const { error } = await props.searchParams;

  return (
    <form action={addOpportunity} className="max-w-md space-y-4">
      <div>
        <h1 className="text-lg font-semibold">Add an opportunity</h1>
        <p className="mt-1 text-sm text-muted">It goes live right away. Please add real, upcoming events only.</p>
      </div>
      <div><label className="label" htmlFor="title">Name</label><input id="title" name="title" required maxLength={200} className="input" /></div>
      <div><label className="label" htmlFor="url">Link</label><input id="url" name="url" type="url" required placeholder="https://" className="input" /></div>
      <div className="flex gap-3">
        <div className="flex-1">
          <label className="label" htmlFor="type">Type</label>
          <select id="type" name="type" className="input">
            {Object.entries(opportunityTypes).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </div>
        <div className="flex-1"><label className="label" htmlFor="location">Location</label><input id="location" name="location" placeholder="Online, Almaty…" className="input" /></div>
      </div>
      <div><label className="label" htmlFor="organizer">Organizer</label><input id="organizer" name="organizer" className="input" /></div>
      <div className="flex gap-3">
        <div className="flex-1"><label className="label" htmlFor="starts_at">Starts</label><input id="starts_at" name="starts_at" type="date" className="input" /></div>
        <div className="flex-1"><label className="label" htmlFor="deadline">Apply by</label><input id="deadline" name="deadline" type="date" className="input" /></div>
      </div>
      <div><label className="label" htmlFor="description">Description</label><textarea id="description" name="description" rows={4} className="input" /></div>
      {typeof error === "string" && <p className="text-sm text-red-600">{error}</p>}
      <button className="btn">Add</button>
    </form>
  );
}
