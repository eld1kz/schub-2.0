import type { ReactNode } from "react";

// Nothing to show yet (DESIGN.md). A line of text where a list would be; with a `title`, a dashed prompt that
// invites the first step (`action`), for the owner's own empty sections.
export function EmptyState({ title, action, children }: { title?: string; action?: ReactNode; children: ReactNode }) {
  if (!title) return <p className="py-8 text-sm text-ink2">{children}</p>;
  return (
    <div className="flex flex-col gap-3 rounded-md border border-dashed border-line2 p-4 sm:px-6 sm:py-6">
      <p className="text-base font-semibold sm:text-lg">{title}</p>
      <p className="max-w-measure text-sm leading-normal text-ink2 sm:text-base">{children}</p>
      {action && <div>{action}</div>}
    </div>
  );
}
