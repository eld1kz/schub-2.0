import { requireAdmin } from "@/lib/admin";
import { approveImport, rejectImport } from "@/app/actions";
import { dateRange, formatDay, placeLabel } from "@/lib/opportunities";
import { ButtonLink, EmptyState, Row, SectionTitle, SubmitButton } from "@/components/ui";
import { AdminShell } from "../admin-shell";
import { ReasonAction } from "../reason-action";

export const instant = false;

const sourceNames: Record<string, string> = { hackclub: "Hack Club", kaggle: "Kaggle", kstartup: "K-Startup", luma: "Luma" };

type Pending = {
  id: string;
  title: string;
  url: string;
  source: string | null;
  location: string;
  city: string;
  country: string | null;
  online: boolean;
  starts_at: string | null;
  ends_at: string | null;
  deadline: string | null;
};

// Events the importer brought in that wait for an admin (opportunity-engine.sql), oldest first. Approve puts one on
// the lists; Edit fixes it and publishes it; Reject removes it for good, with a reason. All logged.
export default async function AdminImportsPage() {
  const { supabase } = await requireAdmin("/admin/imports");
  const { data } = await supabase
    .from("opportunities")
    .select("id, title, url, source, location, city, country, online, starts_at, ends_at, deadline")
    .eq("status", "live")
    .eq("needs_review", true)
    .order("imported_at");
  const pending = (data ?? []) as Pending[];

  return (
    <AdminShell>
      <SectionTitle title="Waiting for review" count={pending.length} />
      {pending.length === 0 ? (
        <EmptyState>Nothing to review. New imports wait here before anyone sees them.</EmptyState>
      ) : (
        <div>
          {pending.map((o) => (
            <Row
              key={o.id}
              label={o.title}
              stack
              actions={
                <>
                  <form action={approveImport.bind(null, o.id)}>
                    <SubmitButton size="sm">Approve</SubmitButton>
                  </form>
                  <ButtonLink href={`/admin/events/${o.id}`} variant="secondary" size="sm">Edit</ButtonLink>
                </>
              }
            >
              <a href={o.url} target="_blank" rel="noopener noreferrer" className="text-lg font-semibold hover:text-accent">{o.title}</a>
              <p className="text-sm text-ink2">
                {[sourceNames[o.source ?? ""] ?? o.source, dateRange(o.starts_at, o.ends_at) || (o.deadline && `Apply by ${formatDay(o.deadline)}`), placeLabel(o) || "Place not known"].filter(Boolean).join(" · ")}
              </p>
              <ReasonAction label="Reject" action={rejectImport.bind(null, o.id)} danger />
            </Row>
          ))}
        </div>
      )}
    </AdminShell>
  );
}
