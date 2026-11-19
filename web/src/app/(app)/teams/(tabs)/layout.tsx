import { Suspense } from "react";
import Link from "next/link";
import { requireUser } from "@/lib/supabase/server";
import { TeamsTabs } from "./teams-tabs";

// Applicants waiting on you, for the Your teams tab
async function TabsWithCount() {
  const { supabase, userId, isGuest } = await requireUser();
  if (isGuest) return <TeamsTabs toReview={0} />;
  // Pending applications you can see that aren't yours are the ones to your own teams
  const { count } = await supabase.from("team_applications").select("id", { count: "exact", head: true }).eq("status", "pending").neq("user_id", userId);
  return <TeamsTabs toReview={count ?? 0} />;
}

export default function TeamsLayout({ children }: LayoutProps<"/teams">) {
  return (
    <div>
      <div className="flex items-end justify-between gap-6 pb-4 sm:pb-6">
        <h1 className="text-[28px] font-semibold tracking-[-0.02em] sm:text-4xl sm:tracking-[-0.03em]">Teams</h1>
        <Link href="/teams/new" className="btn hidden sm:inline-flex">Post a team</Link>
        <Link href="/teams/new" className="pb-1.5 text-[15px] font-semibold text-accent sm:hidden">+ Post</Link>
      </div>
      <Suspense fallback={<TeamsTabs toReview={0} />}>
        <TabsWithCount />
      </Suspense>
      <div className="pt-6 sm:pt-8">{children}</div>
    </div>
  );
}
