import { requireAdmin } from "@/lib/admin";
import { SectionTitle } from "@/components/ui";
import { AdminShell } from "./admin-shell";

export const instant = false;

type Overview = {
  signups: { day: string; count: number }[];
  members: number;
  profiles_completed: number;
  teams: number;
  teams_formed: number;
  applications_accepted: number;
  invites_accepted: number;
  visits: { story: number; link: number };
  open_reports: number;
  suspended: number;
};

const shortDay = (day: string) => new Date(day).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });

// Counts only, nothing about any one person (admin_overview() in supabase/admin.sql)
export default async function AdminOverviewPage() {
  const { supabase } = await requireAdmin("/admin");
  const { data } = await supabase.rpc("admin_overview");
  const o = data as Overview;
  const signups = o.signups.reduce((sum, d) => sum + d.count, 0);
  const stats: [string, number, string?][] = [
    ["Members", o.members],
    ["Profiles completed", o.profiles_completed, "university and at least one skill"],
    ["Teams", o.teams],
    ["Teams formed", o.teams_formed, "at least one member accepted"],
    ["Applications accepted", o.applications_accepted],
    ["Invites accepted", o.invites_accepted],
    ["Visits from story images", o.visits.story, "last 30 days"],
    ["Visits from shared links", o.visits.link, "last 30 days"],
    ["Open reports", o.open_reports],
    ["Suspended", o.suspended],
  ];

  return (
    <AdminShell>
      <section>
        <SectionTitle title="Signups, last 30 days" count={signups} />
        <SignupChart days={o.signups} />
      </section>
      <dl className="mt-12 grid grid-cols-2 border-t border-line2 sm:grid-cols-3">
        {stats.map(([label, value, note]) => (
          <div key={label} className="flex flex-col gap-1 border-b border-border py-4 pr-4">
            <dt className="text-sm text-ink2">{label}</dt>
            <dd className="text-2xl font-semibold tabular-nums">{value}</dd>
            {note && <dd className="text-meta text-muted">{note}</dd>}
          </div>
        ))}
      </dl>
    </AdminShell>
  );
}

// One bar per day in the accent, rounded at the top, 2px apart, on a recessive baseline. Each bar's title is its
// tooltip; the list under it gives every day to screen readers.
function SignupChart({ days }: { days: { day: string; count: number }[] }) {
  const height = 120;
  const slot = 12;
  const bar = 10;
  const top = Math.max(1, ...days.map((d) => d.count));
  const peak = days.reduce((best, d) => (d.count > best.count ? d : best), days[0]);
  return (
    <figure className="flex flex-col gap-2">
      <svg viewBox={`0 0 ${days.length * slot} ${height + 1}`} preserveAspectRatio="none" aria-hidden className="h-28 w-full">
        {days.map((d, i) => {
          const h = (d.count / top) * height;
          const x = i * slot + (slot - bar) / 2;
          const r = Math.min(2, h / 2, bar / 2);
          return (
            <g key={d.day}>
              {/* A full-height hit area, so short bars are easy to hover */}
              <rect x={i * slot} y={0} width={slot} height={height} className="fill-transparent">
                <title>{`${shortDay(d.day)}: ${d.count}`}</title>
              </rect>
              {h > 0 && (
                <path
                  d={`M${x} ${height} V${height - h + r} Q${x} ${height - h} ${x + r} ${height - h} H${x + bar - r} Q${x + bar} ${height - h} ${x + bar} ${height - h + r} V${height} Z`}
                  className="pointer-events-none fill-accent"
                />
              )}
            </g>
          );
        })}
        <line x1={0} x2={days.length * slot} y1={height + 0.5} y2={height + 0.5} className="stroke-border" strokeWidth={1} />
      </svg>
      <figcaption className="flex justify-between text-meta text-muted">
        <span>{shortDay(days[0].day)}</span>
        {peak.count > 0 && <span>Most: {peak.count} on {shortDay(peak.day)}</span>}
        <span>Today</span>
      </figcaption>
      <ul className="sr-only">
        {days.map((d) => <li key={d.day}>{`${shortDay(d.day)}: ${d.count}`}</li>)}
      </ul>
    </figure>
  );
}
