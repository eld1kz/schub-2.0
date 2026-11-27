import type { ReactNode } from "react";
import Link from "next/link";

// A row that goes somewhere: a soft background under the pointer (reaching a little past the text), and room on the
// right for the arrow that slides in. Rows drawn by hand (the opportunity table) use these two as well.
export const linkedRowClass =
  "group/row relative isolate pr-6 before:absolute before:inset-y-0 before:-inset-x-2 before:-z-10 before:rounded-md before:bg-chip before:opacity-0 before:transition-opacity hover:before:opacity-100";

export function RowArrow() {
  return (
    <svg viewBox="0 0 16 16" aria-hidden className="pointer-events-none absolute top-1/2 right-0 h-4 w-4 -translate-y-1/2 -translate-x-2 fill-none stroke-muted opacity-0 transition-[opacity,translate] duration-150 group-focus-within/row:translate-x-0 group-focus-within/row:opacity-100 group-hover/row:translate-x-0 group-hover/row:opacity-100" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <path d="m6 4 4 4-4 4" />
    </svg>
  );
}

// The whole row is the link; the links and buttons inside sit above it
function RowLink({ href }: { href: string }) {
  return (
    <>
      <Link href={href} data-row-link aria-hidden tabIndex={-1} className="absolute inset-0 z-1" />
      <RowArrow />
    </>
  );
}

const aboveRowLink = "[&_:is(a,button):not([data-row-link])]:relative [&_:is(a,button):not([data-row-link])]:z-2";

// One item of a ruled list: a team, a person, an application (DESIGN.md). Content on the left, `actions` on the right.
// `media`: an avatar column before the content; then on phones the actions go under the content.
// `center`: actions centered on the content instead of at its top. `flush`: the first row has no space above it.
// `spacious`: more room from sm up, for rows that lead a page (team lists). `stack`: on phones the actions go under
// the content (wide actions: Accept and Decline, an entry's status). `href`: where the row goes; the whole row links
// there, with a hover background and an arrow.
export function Row({ media, actions, center = false, flush = false, spacious = false, stack = false, id, label, href, className = "", children }: {
  media?: ReactNode;
  actions?: ReactNode;
  center?: boolean;
  flush?: boolean;
  spacious?: boolean;
  stack?: boolean;
  id?: string;
  // Names the row for screen readers and tests
  label?: string;
  href?: string;
  className?: string;
  children: ReactNode;
}) {
  const link = href ? `${linkedRowClass} ${aboveRowLink}` : "";
  const pad = `border-b border-border py-4 ${spacious ? "sm:py-6" : ""} ${flush ? "first:pt-0" : ""} ${link}`;
  if (media) {
    return (
      <article id={id} aria-label={label} className={`grid grid-cols-media gap-x-4 gap-y-3 sm:grid-cols-media-actions sm:items-start ${pad} ${className}`}>
        {media}
        <div className="flex min-w-0 flex-col gap-1">{children}</div>
        {actions && <div className="col-start-2 flex flex-wrap items-center gap-2 sm:col-start-3">{actions}</div>}
        {href && <RowLink href={href} />}
      </article>
    );
  }
  const layout = stack ? "flex-col gap-3 sm:flex-row sm:justify-between sm:gap-6" : "justify-between gap-6";
  const align = center ? "sm:items-center" : "sm:items-start";
  return (
    <article id={id} aria-label={label} className={`flex ${layout} ${stack ? align : center ? "items-center" : "items-start"} ${pad} ${className}`}>
      <div className="flex min-w-0 flex-col gap-1.5">{children}</div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
      {href && <RowLink href={href} />}
    </article>
  );
}
