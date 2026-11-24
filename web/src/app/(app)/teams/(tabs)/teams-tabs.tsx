"use client";

import { usePathname } from "next/navigation";
import { Tabs } from "@/components/ui";

const tabs = [
  { href: "/teams", label: "Find teams" },
  { href: "/teams/mine", label: "Your teams" },
];

// One row at every width. Each tab is its own route, so links and Back work.
export function TeamsTabs({ toReview }: { toReview: number }) {
  const pathname = usePathname();
  return (
    <Tabs
      label="Teams"
      tabs={tabs.map((t) => ({ ...t, current: pathname === t.href, ...(t.href === "/teams/mine" && { count: toReview, alert: true }) }))}
    />
  );
}
