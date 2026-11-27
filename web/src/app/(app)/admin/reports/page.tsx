import Link from "next/link";
import { requireAdmin } from "@/lib/admin";
import { adminDismiss, adminHide, adminSuspend } from "@/app/actions";
import { isReportKind, reasonLabel, targetPath, type ReportKind } from "@/lib/reports";
import { AdminShell, when } from "../admin-shell";
import { ReasonAction } from "../reason-action";
import { PersonLink } from "../../person-link";
import { EmptyState, MonoLabel, SectionTitle } from "@/components/ui";

export const instant = false;

type Report = {
  id: string;
  target_type: ReportKind;
  target_id: string;
  reason: string;
  note: string;
  status: "open" | "dismissed" | "actioned";
  created_at: string;
  reporter: { id: string; name: string } | null;
};

// What a report is about: its name, whether it's hidden already, and the person behind it (to suspend)
type Target = { name: string; hidden: boolean; person: string | null };

const statuses = ["open", "dismissed", "actioned"] as const;
const kindLabel: Record<ReportKind, string> = { person: "People", team: "Teams", event: "Events" };
const perPage = 50;

// One queue for people, teams and events, newest first. Hide the target, dismiss, or suspend the person behind it;
// each needs a reason and is logged.
export default async function AdminReportsPage(props: PageProps<"/admin/reports">) {
  const { supabase } = await requireAdmin("/admin/reports");
  const params = await props.searchParams;
  const kind = isReportKind(params.type) ? params.type : null;
  const status = statuses.find((s) => s === params.status) ?? "open";

  let query = supabase
    .from("reports")
    .select("id, target_type, target_id, reason, note, status, created_at, reporter:profiles(id, name)")
    .eq("status", status)
    .order("created_at", { ascending: false })
    .limit(perPage);
  if (kind) query = query.eq("target_type", kind);
  const reports = ((await query).data ?? []) as unknown as Report[];
  const targets = await loadTargets(supabase, reports);

  const link = (next: { type?: string | null; status?: string }) => {
    const q = new URLSearchParams();
    const t = next.type === undefined ? kind : next.type;
    const s = next.status ?? status;
    if (t) q.set("type", t);
    if (s !== "open") q.set("status", s);
    return `/admin/reports${q.size ? `?${q}` : ""}`;
  };
  const filter = (href: string, label: string, on: boolean) => (
    <Link key={label} href={href} aria-current={on ? "page" : undefined} className="rounded-sm px-2 py-1 text-sm text-ink2 hover:text-foreground aria-[current=page]:bg-chip aria-[current=page]:text-foreground">
      {label}
    </Link>
  );

  return (
    <AdminShell>
      <div className="flex flex-col gap-2 pb-6 sm:flex-row sm:gap-8">
        <div className="flex flex-wrap gap-1">
          {filter(link({ type: null }), "All", !kind)}
          {(Object.keys(kindLabel) as ReportKind[]).map((k) => filter(link({ type: k }), kindLabel[k], kind === k))}
        </div>
        <div className="flex flex-wrap gap-1">
          {statuses.map((s) => filter(link({ status: s }), s[0].toUpperCase() + s.slice(1), status === s))}
        </div>
      </div>

      <SectionTitle title={`${status[0].toUpperCase()}${status.slice(1)} reports`} count={reports.length} />
      {reports.length === 0 ? (
        <EmptyState>Nothing here.</EmptyState>
      ) : (
        <ul>
          {reports.map((r) => {
            const target = targets.get(r.target_id);
            return (
              <li key={r.id} className="flex flex-col gap-2 border-b border-border py-4">
                <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                  <MonoLabel tone="muted">{r.target_type}</MonoLabel>
                  {r.target_type === "person" ? (
                    <PersonLink id={r.target_id} className="text-base font-semibold hover:text-accent">{target?.name || "Deleted"}</PersonLink>
                  ) : (
                    <Link href={targetPath(r.target_type, r.target_id)} className="text-base font-semibold hover:text-accent">{target?.name || "Deleted"}</Link>
                  )}
                  {target?.hidden && <span className="text-sm text-ink2">Hidden</span>}
                  <span className="text-sm text-ink2">{reasonLabel(r.target_type, r.reason)}</span>
                </div>
                {r.note && <p className="max-w-measure text-base">{r.note}</p>}
                <p className="text-meta text-muted">
                  {r.reporter ? <Link href={`/admin/people/${r.reporter.id}`} className="hover:text-foreground">{r.reporter.name || "Unnamed"}</Link> : "Deleted account"} · {when(r.created_at)}
                </p>
                {r.status === "open" && target && (
                  <div className="flex flex-col gap-2 pt-1">
                    {!target.hidden && <ReasonAction label={`Hide ${r.target_type === "event" ? "event" : r.target_type === "team" ? "team" : "profile"}`} action={adminHide.bind(null, r.target_type, r.target_id)} danger />}
                    <ReasonAction label="Dismiss" action={adminDismiss.bind(null, r.id)} />
                    {target.person && <ReasonAction label={r.target_type === "person" ? "Suspend this person" : r.target_type === "team" ? "Suspend the team's owner" : "Suspend who added it"} action={adminSuspend.bind(null, target.person, r.id)} danger />}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </AdminShell>
  );
}

async function loadTargets(supabase: Awaited<ReturnType<typeof requireAdmin>>["supabase"], reports: Report[]) {
  const ids = (k: ReportKind) => [...new Set(reports.filter((r) => r.target_type === k).map((r) => r.target_id))];
  const [people, teams, events] = await Promise.all([
    ids("person").length ? supabase.from("profiles").select("id, name, hidden_at").in("id", ids("person")) : { data: [] },
    ids("team").length ? supabase.from("teams").select("id, title, owner_id, hidden_at").in("id", ids("team")) : { data: [] },
    ids("event").length ? supabase.from("opportunities").select("id, title, status, submitted_by").in("id", ids("event")) : { data: [] },
  ]);
  const map = new Map<string, Target>();
  for (const p of people.data ?? []) map.set(p.id, { name: p.name || "Unnamed", hidden: Boolean(p.hidden_at), person: p.id });
  for (const t of teams.data ?? []) map.set(t.id, { name: t.title, hidden: Boolean(t.hidden_at), person: t.owner_id });
  for (const e of events.data ?? []) map.set(e.id, { name: e.title, hidden: e.status !== "live", person: e.submitted_by });
  return map;
}
