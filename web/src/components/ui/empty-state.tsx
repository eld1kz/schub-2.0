import type { ReactNode } from "react";
import { Inbox, type LucideIcon } from "lucide-react";
import { Icon } from "./icon";

// Nothing to show yet (DESIGN.md): a line icon, one sentence and one action, as a row between two rules. Never just
// gray text. The action goes under the sentence when there isn't room beside it.
export function EmptyState({ icon = Inbox, action, children }: { icon?: LucideIcon; action?: ReactNode; children: ReactNode }) {
  return (
    <div className="flex items-start gap-3 border-y border-border py-4">
      <Icon icon={icon} className="mt-2.5 text-muted" />
      <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-6 gap-y-3">
        <p className="min-w-0 flex-1 basis-60 py-1.5 text-base">{children}</p>
        {action}
      </div>
    </div>
  );
}
