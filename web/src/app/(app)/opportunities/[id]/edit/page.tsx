import { notFound } from "next/navigation";
import { COUNTRY_OPTIONS } from "@/lib/countries";
import { requireUser } from "@/lib/supabase/server";
import { OpportunityForm } from "../../new/opportunity-form";

export const instant = false;

// Admins only: fix an opportunity, usually an import waiting for review ("Edit" in Review imports on /opportunities)
export default async function EditOpportunityPage(props: PageProps<"/opportunities/[id]/edit">) {
  const { id } = await props.params;
  const { supabase, isGuest } = await requireUser();
  if (isGuest) notFound();
  const [{ data: admin }, { data: o }] = await Promise.all([supabase.rpc("is_admin"), supabase.from("opportunities").select("*").eq("id", id).maybeSingle()]);
  if (!admin || !o) notFound();

  return (
    <OpportunityForm
      countries={COUNTRY_OPTIONS}
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
  );
}
