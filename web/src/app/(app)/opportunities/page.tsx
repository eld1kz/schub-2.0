import Link from "next/link";
import { requireUser } from "@/lib/supabase/server";
import { formatDay, opportunityTypes, today, type OpportunityType } from "@/lib/opportunities";
import { setOpportunityStatus } from "@/app/actions";

export default async function OpportunitiesPage(props: PageProps<"/opportunities">) {
  const { type } = await props.searchParams;
  const { supabase } = await requireUser();
  const day = today();

  let query = supabase
    .from("opportunities")
    .select("id, title, type, organizer, location, starts_at, deadline, opportunity_participants(count)")
    .eq("status", "live")
    .or(`deadline.gte.${day},starts_at.gte.${day},and(deadline.is.null,starts_at.is.null)`)
    .order("starts_at", { ascending: true, nullsFirst: false });
  if (typeof type === "string" && type in opportunityTypes) query = query.eq("type", type);

  const [{ data: items }, { data: admin }] = await Promise.all([query, supabase.rpc("is_admin")]);
  const { data: hidden } = admin
    ? await supabase.from("opportunities").select("id, title, opportunity_reports(reason)").eq("status", "hidden").order("created_at")
    : { data: [] };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">Opportunities</h1>
        <Link href="/opportunities/new" className="btn-outline">Add</Link>
      </div>

      {admin && (hidden ?? []).length > 0 && (
        <section className="rounded-md border border-border p-4">
          <h2 className="mb-2 text-sm font-medium">Hidden after reports</h2>
          {(hidden ?? []).map((o) => (
            <div key={o.id} className="flex items-center justify-between gap-3 py-2">
              <div className="text-sm">
                <Link href={`/opportunities/${o.id}`} className="hover:underline">{o.title}</Link>
                <span className="text-muted"> · {(o.opportunity_reports as { reason: string }[]).map((r) => r.reason).join(", ")}</span>
              </div>
              <div className="flex gap-2">
                <form action={setOpportunityStatus.bind(null, o.id, "live")}><button className="btn-outline">Restore</button></form>
                <form action={setOpportunityStatus.bind(null, o.id, "removed")}><button className="btn">Remove</button></form>
              </div>
            </div>
          ))}
        </section>
      )}

      <nav className="flex flex-wrap gap-2 text-sm">
        <Link href="/opportunities" className={!type ? "btn" : "btn-outline"}>All</Link>
        {(Object.keys(opportunityTypes) as OpportunityType[]).map((t) => (
          <Link key={t} href={`/opportunities?type=${t}`} className={type === t ? "btn" : "btn-outline"}>{opportunityTypes[t]}</Link>
        ))}
      </nav>

      <section className="divide-y divide-border border-t border-border">
        {(items ?? []).length === 0 && <p className="py-6 text-sm text-muted">No upcoming opportunities yet.</p>}
        {(items ?? []).map((o) => {
          const looking = (o.opportunity_participants as unknown as { count: number }[])[0]?.count ?? 0;
          return (
            <Link key={o.id} href={`/opportunities/${o.id}`} className="flex items-start justify-between gap-4 py-5 hover:opacity-80">
              <div>
                <p className="font-medium">{o.title}</p>
                <p className="mt-1 text-sm text-muted">
                  {[opportunityTypes[o.type as OpportunityType], o.organizer, o.location, o.starts_at && `Starts ${formatDay(o.starts_at)}`, o.deadline && `Apply by ${formatDay(o.deadline)}`].filter(Boolean).join(" · ")}
                </p>
              </div>
              <span className="shrink-0 text-sm text-muted">{looking} looking for a team</span>
            </Link>
          );
        })}
      </section>
    </div>
  );
}
