import type { ReactNode } from "react";
import Link from "next/link";
import { AwardMark } from "../award-mark";
import { Avatar, Row } from "@/components/ui";

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
    <Row
      flush
      actions={actions}
      media={
        <Link href={`/u/${id}`} aria-hidden tabIndex={-1}>
          <Avatar url={avatarUrl} name={name} size="xl" ring={open ? "open" : null} />
        </Link>
      }
    >
      <span className="flex items-center gap-1.5">
        <Link href={`/u/${id}`} className="w-fit text-base font-semibold hover:text-accent">{name || "Unnamed"}</Link>
        {awarded && <AwardMark />}
      </span>
      {headline && <p className="text-sm leading-snug text-ink2">{headline}</p>}
      {children}
    </Row>
  );
}
