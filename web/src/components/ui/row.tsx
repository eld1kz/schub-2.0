import type { ReactNode } from "react";
import Link from "next/link";
import { Kbd } from "./kbd";

// A row that goes somewhere has no rules: one accent highlight with a bar, following the pointer or the keyboard
// (RowKeys sets data-active), and from sm up the Enter key in the right margin. It reaches into the margins so the
// row's own content stays on the page's lines. Rows drawn by hand (the opportunity table) use these two as well,
// with data-row on the row and data-row-main on its title's link.
export const linkedRowClass =
  "group/row relative isolate before:absolute before:inset-y-0 before:-inset-x-3 sm:before:-right-6 before:-z-10 before:rounded-md before:bg-accent-soft before:opacity-0 before:transition-opacity data-active:before:opacity-100";

export function RowMark() {
  return (
    <span aria-hidden className="pointer-events-none absolute inset-0 opacity-0 transition-opacity group-data-active/row:opacity-100">
      <span className="absolute inset-y-2 -left-3 w-0.5 rounded-full bg-accent" />
      <span className="absolute top-1/2 -right-5 hidden -translate-y-1/2 text-accent sm:block"><Kbd>↵</Kbd></span>
    </span>
  );
}

// The whole row is the link; the links and buttons inside sit above it
function RowLink({ href }: { href: string }) {
  return (
    <>
      <Link href={href} data-row-link aria-hidden tabIndex={-1} className="absolute inset-0 z-1" />
      <RowMark />
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
  const pad = href ? `py-3 ${spacious ? "sm:py-4" : ""} ${link}` : `border-b border-border py-4 ${spacious ? "sm:py-6" : ""} ${flush ? "first:pt-0" : ""}`;
  if (media) {
    return (
      <article id={id} aria-label={label} data-row={href ? "" : undefined} className={`grid grid-cols-media gap-x-4 gap-y-3 sm:grid-cols-media-actions sm:items-start ${pad} ${className}`}>
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
    <article id={id} aria-label={label} data-row={href ? "" : undefined} className={`flex ${layout} ${stack ? align : center ? "items-center" : "items-start"} ${pad} ${className}`}>
      <div className="flex min-w-0 flex-col gap-1.5">{children}</div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
      {href && <RowLink href={href} />}
    </article>
  );
}
