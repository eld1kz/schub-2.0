import { Suspense } from "react";
import Link from "next/link";
import { requireUser } from "@/lib/supabase/server";
import { teamsWaiting } from "@/lib/teams";
import { TeamsTabs } from "./teams-tabs";
import { ButtonLink, PageHeader } from "@/components/ui";

// Applicants and invitations waiting on you, for the Your teams tab
async function TabsWithCount() {
  const { supabase, userId, isGuest } = await requireUser();
  if (isGuest) return <TeamsTabs toReview={0} />;
  return <TeamsTabs toReview={await teamsWaiting(supabase, userId)} />;
}

export default function TeamsLayout({ children }: LayoutProps<"/teams">) {
  return (
    <div>
      <PageHeader
        title="Teams"
        className="pb-4 sm:pb-6"
        action={
          <>
            <ButtonLink href="/teams/new" showFrom="sm">Post a team</ButtonLink>
            <Link href="/teams/new" className="pb-1.5 text-base font-semibold text-accent sm:hidden">+ Post</Link>
          </>
        }
      />
      <Suspense fallback={<TeamsTabs toReview={0} />}>
        <TabsWithCount />
      </Suspense>
      <div className="pt-6 sm:pt-8">{children}</div>
    </div>
  );
}
