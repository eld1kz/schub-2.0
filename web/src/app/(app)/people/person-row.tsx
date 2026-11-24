import type { ReactNode } from "react";
import Link from "next/link";
import { Avatar } from "../avatar";
import { AwardMark } from "../award-mark";

// One person in a People tab: avatar, name and headline, details under them, and actions on the right
export function PersonRow({ id, name, headline, avatarUrl, awarded = false, open = false, children, actions }: {
  id: string;
  name: string;
  headline: string;
  avatarUrl: string;
  // They have an award: a small medal after the name
  awarded?: boolean;
  // Open to a team: a green ring on the photo
  open?: boolean;
  children?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <article className="grid grid-cols-[44px_minmax(0,1fr)] gap-x-4 gap-y-3 border-b border-border py-4 first:pt-0 sm:grid-cols-[44px_minmax(0,1fr)_auto] sm:items-start">
      <Link href={`/u/${id}`} aria-hidden tabIndex={-1}>
        <Avatar url={avatarUrl} name={name} className="h-11 w-11 text-sm" sizes="44px" open={open} />
      </Link>
      <div className="flex min-w-0 flex-col gap-1">
        <span className="flex items-center gap-1.5">
          <Link href={`/u/${id}`} className="w-fit text-base font-semibold hover:text-accent">{name || "Unnamed"}</Link>
          {awarded && <AwardMark />}
        </span>
        {headline && <p className="text-sm leading-snug text-ink2">{headline}</p>}
        {children}
      </div>
      {actions && <div className="col-start-2 flex flex-wrap items-center gap-2 sm:col-start-3">{actions}</div>}
    </article>
  );
}
