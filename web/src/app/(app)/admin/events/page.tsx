import Link from "next/link";
import { requireAdmin } from "@/lib/admin";
import { adminHide, adminRestore, adminSetFeatured } from "@/app/actions";
import { opportunityTypes, type OpportunityType } from "@/lib/opportunities";
import { AdminShell } from "../admin-shell";
import { ReasonAction } from "../reason-action";
import { Button, EmptyState, Input, MonoLabel, SectionTitle, SubmitButton } from "@/components/ui";

export const instant = false;

type Event = { id: string; title: string; type: OpportunityType; status: "live" | "hidden" | "removed"; featured: boolean; starts_at: string | null; deadline: string | null };

const views = [
  ["live", "Live"],
  ["featured", "Featured"],
  ["hidden", "Hidden"],
  ["removed", "Removed"],
] as const;

const containing = (q: string) => `%${q.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;

// Every event, whatever its status: feature, edit, hide, restore. All logged.
export default async function AdminEventsPage(props: PageProps<"/admin/events">) {
  const { supabase } = await requireAdmin("/admin/events");
  const params = await props.searchParams;
  const view = views.find(([v]) => v === params.view)?.[0] ?? "live";
  const q = typeof params.q === "string" ? params.q.trim().slice(0, 80) : "";

  let query = supabase.from("opportunities").select("id, title, type, status, featured, starts_at, deadline").order("created_at", { ascending: false }).limit(100);
  query = view === "featured" ? query.eq("featured", true) : query.eq("status", view);
  if (q) query = query.ilike("title", containing(q));
  const events = ((await query).data ?? []) as Event[];

  return (
    <AdminShell>
      <div className="flex flex-col gap-3 pb-6 sm:flex-row sm:items-center sm:gap-8">
        <div className="flex flex-wrap gap-1">
          {views.map(([v, label]) => (
            <Link key={v} href={`/admin/events?view=${v}${q ? `&q=${encodeURIComponent(q)}` : ""}`} aria-current={view === v ? "page" : undefined} className="rounded-sm px-2 py-1 text-sm text-ink2 hover:text-foreground aria-[current=page]:bg-chip aria-[current=page]:text-foreground">
              {label}
            </Link>
          ))}
        </div>
        <form role="search" className="flex flex-1 gap-2 sm:max-w-narrow">
          <input type="hidden" name="view" value={view} />
          <label htmlFor="admin-events-q" className="sr-only">Title</label>
          <Input id="admin-events-q" name="q" small defaultValue={q} placeholder="Search by title" />
          <Button variant="secondary" size="sm">Search</Button>
        </form>
      </div>

      <SectionTitle title="Events" count={events.length} />
      {events.length === 0 ? (
        <EmptyState>Nothing here.</EmptyState>
      ) : (
        <ul>
          {events.map((e) => (
            <li key={e.id} className="flex flex-col gap-2 border-b border-border py-4">
              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <Link href={`/opportunities/${e.id}`} className="text-base font-semibold hover:text-accent">{e.title}</Link>
                <MonoLabel>{opportunityTypes[e.type]}</MonoLabel>
                {e.featured && <span className="text-sm font-medium text-accent">Featured</span>}
                {e.status !== "live" && <span className="text-sm text-ink2">{e.status === "hidden" ? "Hidden" : "Removed"}</span>}
              </div>
              <div className="flex flex-wrap items-start gap-x-6 gap-y-2">
                <Link href={`/admin/events/${e.id}`} className="text-sm font-medium text-ink2 hover:text-foreground">Edit</Link>
                {e.status === "live" && (
                  <form action={adminSetFeatured.bind(null, e.id, !e.featured)}>
                    <SubmitButton variant="quiet" size="sm">{e.featured ? "Stop featuring" : "Feature"}</SubmitButton>
                  </form>
                )}
                {e.status === "live"
                  ? <ReasonAction key="Hide" label="Hide" action={adminHide.bind(null, "event", e.id)} danger />
                  : <ReasonAction key="Restore" label="Restore" action={adminRestore.bind(null, "event", e.id)} required={false} />}
              </div>
            </li>
          ))}
        </ul>
      )}
    </AdminShell>
  );
}
