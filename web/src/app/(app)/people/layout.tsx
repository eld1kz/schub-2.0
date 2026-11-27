import { Suspense } from "react";
import { requireUser } from "@/lib/supabase/server";
import { PeopleTabs } from "./people-tabs";
import { PageHeader } from "@/components/ui";

// Incoming requests waiting on you, for the Requests tab
async function TabsWithCount() {
  const { supabase, userId, isGuest } = await requireUser();
  if (isGuest) return <PeopleTabs requests={0} />;
  const { count } = await supabase.from("connections").select("id", { count: "exact", head: true }).eq("receiver_id", userId).eq("status", "pending");
  return <PeopleTabs requests={count ?? 0} />;
}

export default function PeopleLayout({ children }: LayoutProps<"/people">) {
  return (
    <div>
      <PageHeader title="People" className="pb-4 sm:pb-6" />
      <Suspense fallback={<PeopleTabs requests={0} />}>
        <TabsWithCount />
      </Suspense>
      <div className="pt-6 sm:pt-8">{children}</div>
    </div>
  );
}
