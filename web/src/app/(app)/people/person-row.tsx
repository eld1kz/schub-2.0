import type { ReactNode } from "react";
import { AwardMark } from "../award-mark";
import { Avatar, Row } from "@/components/ui";
import { PersonLink } from "../person-link";

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
      href={`/u/${id}`}
      actions={actions}
      media={
        <PersonLink id={id} aria-hidden tabIndex={-1}>
          <Avatar url={avatarUrl} name={name} size="xl" ring={open ? "open" : null} />
        </PersonLink>
      }
    >
      <span className="flex items-center gap-1.5">
        <PersonLink id={id} data-row-main className="w-fit text-base font-semibold hover:text-accent">{name || "Unnamed"}</PersonLink>
        {awarded && <AwardMark />}
      </span>
      {headline && <p className="text-sm leading-snug text-ink2">{headline}</p>}
      {children}
    </Row>
  );
}
