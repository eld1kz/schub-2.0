// What can be reported, and for what. The same lists are checked by the database (reports_reason_known in
// supabase/admin.sql).
export type ReportKind = "person" | "team" | "event";

export const REPORT_REASONS: Record<ReportKind, Record<string, string>> = {
  person: { spam: "Spam", fake: "Fake account", harassment: "Harassment", inappropriate: "Inappropriate", other: "Other" },
  team: { spam: "Spam", fake: "Fake team", inappropriate: "Inappropriate", other: "Other" },
  event: { fake: "Fake or spam", duplicate: "Duplicate", expired: "Expired", other: "Other" },
};

export const REPORT_NOTE_MAX = 500;
export const ADMIN_REASON_MAX = 500;

export const isReportKind = (kind: unknown): kind is ReportKind => kind === "person" || kind === "team" || kind === "event";

export const reasonLabel = (kind: ReportKind, reason: string) => REPORT_REASONS[kind][reason] ?? reason;

// Where an admin opens what a report is about
export function targetPath(kind: ReportKind, id: string) {
  return kind === "person" ? `/u/${id}` : kind === "team" ? `/teams/${id}` : `/opportunities/${id}`;
}
