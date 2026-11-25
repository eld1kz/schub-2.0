"use client";

import { usePathname } from "next/navigation";
import { Tabs } from "@/components/ui";

const tabs = [
  { href: "/admin", label: "Overview" },
  { href: "/admin/reports", label: "Reports" },
  { href: "/admin/imports", label: "Imports" },
  { href: "/admin/people", label: "People" },
  { href: "/admin/events", label: "Events" },
  { href: "/admin/log", label: "Log" },
];

// The admin sections; on phones they scroll sideways in one row
export function AdminTabs() {
  const pathname = usePathname();
  const current = (href: string) => (href === "/admin" ? pathname === href : pathname.startsWith(href));
  return <Tabs label="Admin" scroll tabs={tabs.map((t) => ({ ...t, current: current(t.href) }))} />;
}
