"use client";

import { useState, type ReactNode } from "react";
import { Avatar, type AvatarRing } from "./avatar";

export type Slot = {
  // Stays the same when the slot is filled
  id: string;
  role: string;
  filled: boolean;
  // Who's in it. A filled slot can have none, when their profile can't be read.
  member?: { id: string; name: string; avatar_url: string; ring?: AvatarRing; you?: boolean };
};

// A team as a row of equal seats (DESIGN.md): filled ones show the member with their role under the photo, open ones
// are dashed outlines with the role inside. `closed`: the team's event is over, so open slots aren't recruiting.
// A slot that's filled while it's on screen drops its photo into place; nothing animates on load.
// `wrapMember` puts a filled slot in a link (the app's TeamRowSlots).
export function TeamSlots({ slots, size = "sm", closed = false, wrapMember }: {
  slots: Slot[];
  size?: "sm" | "lg";
  closed?: boolean;
  wrapMember?: (memberId: string, content: ReactNode) => ReactNode;
}) {
  // Slots seen open here: one of these that's filled now has just been filled
  const [wasOpen, setWasOpen] = useState<ReadonlySet<string>>(new Set());
  const unseen = slots.filter((s) => !s.filled && !wasOpen.has(s.id));
  if (unseen.length > 0) setWasOpen(new Set([...wasOpen, ...unseen.map((s) => s.id)]));

  const large = size === "lg";
  const filled = slots.filter((s) => s.filled).length;
  const type = large ? "text-meta" : "text-xs";
  const box = large ? "h-20" : "h-12";

  return (
    <ul aria-label={`${filled} of ${slots.length} slots filled`} className={`flex flex-wrap items-start ${large ? "gap-3" : "gap-2"}`}>
      {slots.map((s) => {
        const content = (
          <>
            <span className={`flex items-center justify-center ${box} ${wasOpen.has(s.id) ? "animate-slot-in" : ""}`}>
              <Avatar url={s.member?.avatar_url ?? ""} name={s.member?.name ?? ""} size={large ? "2xl" : "xl"} ring={s.member?.ring ?? null} />
            </span>
            <span className="sr-only">{s.member?.you ? "You" : s.member?.name || "Unnamed"}, </span>
            <span className={`line-clamp-2 w-full text-center leading-tight break-words ${type} ${s.member?.you ? "font-semibold text-accent" : "text-ink2"}`}>{s.role}</span>
          </>
        );
        const column = "flex w-full flex-col items-center gap-1";
        return (
          <li key={s.id} className={`flex flex-col ${large ? "w-28" : "w-18"}`}>
            {s.filled ? (
              s.member && wrapMember ? (
                wrapMember(s.member.id, content)
              ) : (
                <span className={column}>{content}</span>
              )
            ) : (
              <span className={`flex w-full items-center justify-center rounded-md border border-dashed px-1 text-center ${box} ${closed ? "border-border text-muted" : "border-line2 text-ink2"}`}>
                <span className={`line-clamp-2 leading-tight break-words ${type}`}>{s.role}</span>
                <span className="sr-only">, {closed ? "not recruiting" : "open"}</span>
              </span>
            )}
          </li>
        );
      })}
    </ul>
  );
}
