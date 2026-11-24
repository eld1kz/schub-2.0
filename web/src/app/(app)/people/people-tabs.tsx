"use client";

import { usePathname } from "next/navigation";
import { Tabs } from "@/components/ui";

const tabs = [
  { href: "/people", label: "Discover" },
  { href: "/people/requests", label: "Requests" },
  { href: "/people/connections", label: "Connections" },
];

// One row at every width. Each tab is its own route, so links and Back work.
export function PeopleTabs({ requests }: { requests: number }) {
  const pathname = usePathname();
  return (
    <Tabs
      label="People"
      tabs={tabs.map((t) => ({ ...t, current: pathname === t.href, ...(t.href === "/people/requests" && { count: requests, alert: true }) }))}
    />
  );
}
