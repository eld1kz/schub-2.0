import Link from "next/link";
import { openRoles, type TeamSummary } from "@/lib/teams";

export function TeamList({ teams, userId, empty }: { teams: TeamSummary[]; userId: string; empty: string }) {
  return (
    <div className="divide-y divide-border border-t border-border">
      {teams.length === 0 && <p className="py-6 text-sm text-muted">{empty}</p>}
      {teams.map((t) => {
        const open = openRoles(t);
        const mine = t.owner_id === userId;
        // Owners see every application to their team; everyone else only sees accepted ones and their own
        const toReview = mine ? t.team_applications.filter((a) => a.status === "pending").length : 0;
        return (
          <Link key={t.id} href={`/teams/${t.id}`} className="block py-5 hover:opacity-80">
            <p className="font-medium">{t.title}</p>
            <p className="mt-1 text-sm text-muted">
              {[mine ? "Your team" : t.owner?.name || "Unnamed", t.opportunity?.title].filter(Boolean).join(" · ")}
            </p>
            <p className="mt-2 text-sm">{open.length > 0 ? `Looking for: ${open.join(", ")}` : "All roles filled"}</p>
            {toReview > 0 && <p className="mt-1 text-sm font-medium">{toReview} to review</p>}
          </Link>
        );
      })}
    </div>
  );
}
