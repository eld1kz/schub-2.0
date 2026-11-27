import type { ReactNode } from "react";
import { PageHeader } from "@/components/ui";
import { AdminTabs } from "./admin-tabs";

// Every admin page: the title, the section tabs, then the page. Rendered only after requireAdmin() let the
// visitor in, so nobody else ever sees the tabs (there's no admin layout doing it, which would wrap not-found too).
export function AdminShell({ children }: { children: ReactNode }) {
  return (
    <div>
      <PageHeader title="Admin" className="pb-4 sm:pb-6" />
      <AdminTabs />
      <div className="pt-6 sm:pt-8">{children}</div>
    </div>
  );
}

// Times in Korea, where the team is
export const when = (iso: string) =>
  new Date(iso).toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit", timeZone: "Asia/Seoul" });
