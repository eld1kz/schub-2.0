import Link from "next/link";
import { requireAdmin } from "@/lib/admin";
import { isReportKind, targetPath } from "@/lib/reports";
import { AdminShell, when } from "../admin-shell";
import { PersonLink } from "../../person-link";
import { EmptyState, MonoLabel, SectionTitle } from "@/components/ui";

export const instant = false;

type Entry = { id: number; admin_id: string; action: string; target_type: "person" | "team" | "event"; target_id: string; reason: string; details: Record<string, unknown>; created_at: string };

const actions = ["hide", "restore", "suspend", "unsuspend", "dismiss", "feature", "unfeature", "edit"];
const perPage = 50;

// What changed, in a line: before and after for edits, hides and features; how many reports it closed
function detailLine(d: Record<string, unknown>) {
  const parts: string[] = [];
  const before = d.before;
  const after = d.after;
  if (before && typeof before === "object" && after && typeof after === "object") {
    for (const key of Object.keys(after)) parts.push(`${key}: ${JSON.stringify((before as Record<string, unknown>)[key])} → ${JSON.stringify((after as Record<string, unknown>)[key])}`);
  } else if (before !== undefined) parts.push(`${String(before)} → ${String(after)}`);
  if (Array.isArray(d.reports) && d.reports.length > 0) parts.push(`${d.reports.length} ${d.reports.length === 1 ? "report" : "reports"} closed`);
  if (typeof d.suspended_for === "string") parts.push(`was suspended for: ${d.suspended_for}`);
  return parts.join(" · ");
}

// The audit log, read-only (nobody can change it: supabase/admin.sql), newest first, filterable
export default async function AdminLogPage(props: PageProps<"/admin/log">) {
  const { supabase } = await requireAdmin("/admin/log");
  const params = await props.searchParams;
  const action = actions.find((a) => a === params.action) ?? null;
  const kind = isReportKind(params.type) ? params.type : null;
  const target = typeof params.target === "string" && /^[0-9a-f-]{36}$/.test(params.target) ? params.target : null;
  const page = Math.max(1, Number(params.page) || 1);

  let query = supabase.from("admin_actions").select("*", { count: "exact" }).order("id", { ascending: false }).range((page - 1) * perPage, page * perPage - 1);
  if (action) query = query.eq("action", action);
  if (kind) query = query.eq("target_type", kind);
  if (target) query = query.eq("target_id", target);
  const { data, count } = await query;
  const entries = (data ?? []) as Entry[];

  // Names of the admins and of what they acted on
  const ids = (k: string) => [...new Set(entries.filter((e) => e.target_type === k).map((e) => e.target_id))];
  const [people, teams, events] = await Promise.all([
    supabase.from("profiles").select("id, name").in("id", [...new Set([...entries.map((e) => e.admin_id), ...ids("person")])]),
    ids("team").length ? supabase.from("teams").select("id, title").in("id", ids("team")) : { data: [] },
    ids("event").length ? supabase.from("opportunities").select("id, title").in("id", ids("event")) : { data: [] },
  ]);
  const names = new Map<string, string>([
    ...(people.data ?? []).map((p) => [p.id, p.name || "Unnamed"] as [string, string]),
    ...(teams.data ?? []).map((t) => [t.id, t.title] as [string, string]),
    ...(events.data ?? []).map((o) => [o.id, o.title] as [string, string]),
  ]);

  const href = (next: Record<string, string | null>) => {
    const q = new URLSearchParams();
    const merged = { action, type: kind, target, ...next };
    for (const [k, v] of Object.entries(merged)) if (v) q.set(k, v);
    return `/admin/log${q.size ? `?${q}` : ""}`;
  };
  const chip = (label: string, to: string, on: boolean) => (
    <Link key={label} href={to} aria-current={on ? "page" : undefined} className="rounded-sm px-2 py-1 text-sm text-ink2 hover:text-foreground aria-[current=page]:bg-chip aria-[current=page]:text-foreground">{label}</Link>
  );
  const pages = Math.ceil((count ?? 0) / perPage);

  return (
    <AdminShell>
      <div className="flex flex-col gap-2 pb-6">
        <div className="flex flex-wrap gap-1">
          {chip("Every action", href({ action: null, page: null }), !action)}
          {actions.map((a) => chip(a[0].toUpperCase() + a.slice(1), href({ action: a, page: null }), action === a))}
        </div>
        <div className="flex flex-wrap gap-1">
          {chip("Everything", href({ type: null, page: null }), !kind)}
          {(["person", "team", "event"] as const).map((k) => chip(k === "person" ? "People" : k === "team" ? "Teams" : "Events", href({ type: k, page: null }), kind === k))}
          {target && chip(`Only ${names.get(target) ?? "this one"} ×`, href({ target: null, page: null }), true)}
        </div>
      </div>

      <SectionTitle title="Log" count={count ?? 0} />
      {entries.length === 0 ? (
        <EmptyState>Nothing logged yet.</EmptyState>
      ) : (
        <ol>
          {entries.map((e) => (
            <li key={e.id} className="flex flex-col gap-1 border-b border-border py-3 text-sm">
              <p className="flex flex-wrap items-baseline gap-x-2">
                <span className="font-semibold">{names.get(e.admin_id) ?? "A former admin"}</span>
                <MonoLabel tone="muted">{e.action}</MonoLabel>
                {e.target_type === "person" ? (
                  <PersonLink id={e.target_id} className="font-medium hover:text-accent">{names.get(e.target_id) ?? "Deleted person"}</PersonLink>
                ) : (
                  <Link href={targetPath(e.target_type, e.target_id)} className="font-medium hover:text-accent">{names.get(e.target_id) ?? `Deleted ${e.target_type}`}</Link>
                )}
                <Link href={href({ target: e.target_id, page: null })} className="text-meta text-muted hover:text-foreground">history</Link>
              </p>
              {e.reason && <p className="text-base">{e.reason}</p>}
              {detailLine(e.details) && <p className="break-words text-ink2">{detailLine(e.details)}</p>}
              <p className="text-meta text-muted">{when(e.created_at)}</p>
            </li>
          ))}
        </ol>
      )}
      {pages > 1 && (
        <nav aria-label="Pages" className="flex justify-between pt-4 text-sm font-medium">
          {page > 1 ? <Link href={href({ page: String(page - 1) })} className="hover:text-accent">Newer</Link> : <span />}
          {page < pages ? <Link href={href({ page: String(page + 1) })} className="hover:text-accent">Older</Link> : <span />}
        </nav>
      )}
    </AdminShell>
  );
}
