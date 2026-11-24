import type { ReactNode } from "react";

// One item of a ruled list: a team, a person, an application (DESIGN.md). Content on the left, `actions` on the right.
// `media`: an avatar column before the content; then on phones the actions go under the content.
// `center`: actions centered on the content instead of at its top. `flush`: the first row has no space above it.
// `spacious`: more room from sm up, for rows that lead a page (team lists). `stack`: on phones the actions go under
// the content (wide actions: Accept and Decline, an entry's status).
export function Row({ media, actions, center = false, flush = false, spacious = false, stack = false, id, label, className = "", children }: {
  media?: ReactNode;
  actions?: ReactNode;
  center?: boolean;
  flush?: boolean;
  spacious?: boolean;
  stack?: boolean;
  id?: string;
  // Names the row for screen readers and tests
  label?: string;
  className?: string;
  children: ReactNode;
}) {
  const pad = `border-b border-border py-4 ${spacious ? "sm:py-6" : ""} ${flush ? "first:pt-0" : ""}`;
  if (media) {
    return (
      <article id={id} aria-label={label} className={`grid grid-cols-media gap-x-4 gap-y-3 sm:grid-cols-media-actions sm:items-start ${pad} ${className}`}>
        {media}
        <div className="flex min-w-0 flex-col gap-1">{children}</div>
        {actions && <div className="col-start-2 flex flex-wrap items-center gap-2 sm:col-start-3">{actions}</div>}
      </article>
    );
  }
  const layout = stack ? "flex-col gap-3 sm:flex-row sm:justify-between sm:gap-6" : "justify-between gap-6";
  const align = center ? "sm:items-center" : "sm:items-start";
  return (
    <article id={id} aria-label={label} className={`flex ${layout} ${stack ? align : center ? "items-center" : "items-start"} ${pad} ${className}`}>
      <div className="flex min-w-0 flex-col gap-1.5">{children}</div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </article>
  );
}
