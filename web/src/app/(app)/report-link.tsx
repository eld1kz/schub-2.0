import { report } from "@/app/actions";
import { REPORT_NOTE_MAX, REPORT_REASONS, reasonLabel, type ReportKind } from "@/lib/reports";
import { Combobox, SubmitButton, Textarea } from "@/components/ui";

const what: Record<ReportKind, string> = { person: "this profile", team: "this team", event: "this listing" };

// A quiet "Report" link at the foot of a profile, team or event page. It opens a reason and an optional note;
// once sent it says what you reported it as. Admins see reports in /admin.
export function ReportLink({ kind, targetId, myReport }: { kind: ReportKind; targetId: string; myReport: string | null }) {
  if (myReport) return <p>You reported {what[kind]} as {reasonLabel(kind, myReport).toLowerCase()}.</p>;
  return (
    <details className="group">
      <summary className="cursor-pointer list-none hover:text-foreground [&::-webkit-details-marker]:hidden">Report {what[kind]}</summary>
      <form action={report.bind(null, kind, targetId)} className="mt-3 flex max-w-dialog flex-col gap-2">
        <Combobox name="reason" label="What's wrong" placeholder="What's wrong?" small options={Object.entries(REPORT_REASONS[kind]).map(([value, label]) => ({ value, label }))} />
        <Textarea name="note" aria-label="Anything to add (optional)" placeholder="Anything to add (optional)" maxLength={REPORT_NOTE_MAX} rows={2} className="text-sm" />
        <SubmitButton variant="secondary" size="sm" className="self-start">Send report</SubmitButton>
      </form>
    </details>
  );
}
