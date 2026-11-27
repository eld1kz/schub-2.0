import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/admin";
import { adminHide, adminRestore, adminSuspend, adminUnsuspend } from "@/app/actions";
import { SectionTitle } from "@/components/ui";
import { AdminShell, when } from "../../admin-shell";
import { ReasonAction } from "../../reason-action";

export const instant = false;

type Summary = {
  joined: string | null;
  last_sign_in: string | null;
  two_factor: boolean;
  admin: boolean;
  hidden_at: string | null;
  suspension: { reason: string; since: string } | null;
  teams_owned: number;
  teams_joined: number;
  applications: number;
  connections: number;
  events_added: number;
  reports_made: number;
  reports_against: number;
};

// One person's activity, as counts (admin_person_summary() in supabase/admin.sql), and what an admin can do
export default async function AdminPersonPage(props: PageProps<"/admin/people/[id]">) {
  const { id } = await props.params;
  const { supabase } = await requireAdmin(`/admin/people/${id}`);
  const [{ data: profile }, { data }] = await Promise.all([
    supabase.from("profiles").select("name, headline").eq("id", id).maybeSingle(),
    supabase.rpc("admin_person_summary", { person: id }),
  ]);
  if (!profile || !data) notFound();
  const s = data as Summary;
  const rows: [string, string | number][] = [
    ["Joined", s.joined ? when(s.joined) : "Unknown"],
    ["Last signed in", s.last_sign_in ? when(s.last_sign_in) : "Never"],
    ["Two-factor", s.two_factor ? "On" : "Off"],
    ["Teams started", s.teams_owned],
    ["Teams joined", s.teams_joined],
    ["Applications sent", s.applications],
    ["Connections", s.connections],
    ["Events added", s.events_added],
    ["Reports made", s.reports_made],
    ["Reports about them", s.reports_against],
  ];

  return (
    <AdminShell>
      <div className="flex flex-col gap-1 pb-6">
        <h2 className="text-xl font-semibold tracking-snug">{profile.name || "Unnamed"}{s.admin && <span className="ml-2 text-sm font-normal text-ink2">Admin</span>}</h2>
        {profile.headline && <p className="text-base text-ink2">{profile.headline}</p>}
        <Link href={`/u/${id}`} className="w-fit text-sm font-semibold text-accent hover:underline">Open profile</Link>
      </div>

      {(s.suspension || s.hidden_at) && (
        <div className="mb-6 flex flex-col gap-1 rounded-md border border-danger p-3 text-sm">
          {s.suspension && <p><span className="font-medium">Suspended</span> since {when(s.suspension.since)}: {s.suspension.reason}</p>}
          {s.hidden_at && <p><span className="font-medium">Profile hidden</span> since {when(s.hidden_at)}</p>}
        </div>
      )}

      <SectionTitle title="Activity" />
      <dl>
        {rows.map(([label, value]) => (
          <div key={label} className="grid grid-cols-label gap-3 border-b border-border py-2 text-sm">
            <dt className="text-ink2">{label}</dt>
            <dd className="tabular-nums">{value}</dd>
          </div>
        ))}
      </dl>

      {!s.admin && (
        <div className="flex flex-col gap-3 pt-6">
          <SectionTitle title="Actions" />
          {s.hidden_at
            ? <ReasonAction key="Show profile again" label="Show profile again" action={adminRestore.bind(null, "person", id)} required={false} />
            : <ReasonAction key="Hide profile" label="Hide profile" action={adminHide.bind(null, "person", id)} danger />}
          {s.suspension
            ? <ReasonAction key="Unsuspend" label="Unsuspend" action={adminUnsuspend.bind(null, id)} required={false} />
            : <ReasonAction key="Suspend" label="Suspend" action={adminSuspend.bind(null, id, null)} danger />}
        </div>
      )}
    </AdminShell>
  );
}
