import type { ReactNode } from "react";

// A count after a title, in the muted color
export function Count({ n }: { n?: number }) {
  return n === undefined ? null : <span className="ml-1.5 font-normal text-muted">{n}</span>;
}

// A section with its title in a fixed label column, ruled off from the one above (DESIGN.md). The structure comes
// from alignment, not cards: from sm up the title sits in a 152px column; with `owner` there's a third column for
// the pencil (`edit`). On phones the title sits above and the pencil at the top right.
export function Section({ id, title, quiet = false, count, add, edit, editOnHover = false, owner = false, children }: {
  // For links to the section, like "#awards"
  id?: string;
  title: string;
  // An empty section on your own page: the title steps back
  quiet?: boolean;
  count?: number;
  // "+ Add" under the title
  add?: ReactNode;
  edit?: ReactNode;
  // The pencil shows on hover or keyboard focus (touch screens always show it)
  editOnHover?: boolean;
  owner?: boolean;
  children: ReactNode;
}) {
  return (
    <section id={id} className={`group/section relative border-t border-line2 py-6 sm:grid sm:gap-8 sm:py-8 ${owner ? "sm:grid-cols-label-edit" : "sm:grid-cols-label"}`}>
      <div className="mb-4 flex items-baseline justify-between gap-4 sm:mb-0 sm:flex-col sm:justify-start sm:gap-2">
        <h2 className={`text-base font-semibold ${quiet ? "text-ink2" : ""}`}>
          {title}
          <Count n={count} />
        </h2>
        {add}
      </div>
      <div className="min-w-0">{children}</div>
      {edit && (
        <div className={`absolute top-4 right-0 sm:static sm:-mt-1.5 ${editOnHover ? "transition-opacity [@media(hover:hover)]:opacity-0 group-focus-within/section:opacity-100 group-hover/section:opacity-100" : ""}`}>
          {edit}
        </div>
      )}
    </section>
  );
}

// A full-width section title over a ruled list, for pages without a label column (an event's teams and people).
// `action` sits at the right of the title.
export function SectionTitle({ title, count, action, as: Tag = "h2" }: { title: string; count?: number; action?: ReactNode; as?: "h2" | "h3" }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-line2 pb-3">
      <Tag className="text-lg font-semibold">
        {title}
        <Count n={count} />
      </Tag>
      {action}
    </div>
  );
}
