import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/admin";
import { countryChoices } from "../../../opportunities/new/country-choices";
import { OpportunityForm } from "../../../opportunities/new/opportunity-form";
import { AdminShell } from "../../admin-shell";

export const instant = false;

// Fix an event, often an import waiting for review ("Edit" in Imports). Saving goes through admin_edit_event,
// which logs what changed and marks it reviewed (supabase/admin.sql).
export default async function AdminEditEventPage(props: PageProps<"/admin/events/[id]">) {
  const { id } = await props.params;
  const { supabase } = await requireAdmin(`/admin/events/${id}`);
  const { data: o } = await supabase.from("opportunities").select("*").eq("id", id).maybeSingle();
  if (!o) notFound();

  return (
    <AdminShell>
      <OpportunityForm
        countries={await countryChoices(supabase)}
        edit={{
          id,
          pending: o.needs_review,
          values: {
            title: o.title,
            type: o.type,
            url: o.url,
            organizer: o.organizer,
            description: o.description,
            deadline: o.deadline ?? "",
            starts_at: o.starts_at ?? "",
            ends_at: o.ends_at ?? "",
            // Older ones only have the typed-in location
            city: o.city || o.location,
            country: o.country ?? "",
            online: o.online,
            languages: o.languages,
            eligibility: o.eligibility,
            eligibility_note: o.eligibility_note,
          },
        }}
      />
    </AdminShell>
  );
}
