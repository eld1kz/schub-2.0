"use client";

import { useState } from "react";
import { Avatar, type AvatarRing } from "./avatar";

export type Slot = {
  // Stays the same when the slot is filled
  id: string;
  role: string;
  // Who's in it; none while it's open
  member?: { name: string; avatar_url: string; ring?: AvatarRing; you?: boolean };
};

// A team as a row of slots (DESIGN.md): filled ones show the member with their role under the photo, open ones are
// dashed outlines with the role inside. `closed`: the team's event is over, so open slots aren't recruiting.
// A slot that's filled while it's on screen drops its photo into place; nothing animates on load.
// `variant` is being picked on /design: "seats" are equal tiles, "pills" are as wide as their role.
export function TeamSlots({ slots, variant, size = "sm", closed = false }: { slots: Slot[]; variant: "seats" | "pills"; size?: "sm" | "lg"; closed?: boolean }) {
  // Slots seen open here: one of these with a member now has just been filled
  const [wasOpen, setWasOpen] = useState<ReadonlySet<string>>(new Set());
  const unseen = slots.filter((s) => !s.member && !wasOpen.has(s.id));
  if (unseen.length > 0) setWasOpen(new Set([...wasOpen, ...unseen.map((s) => s.id)]));

  const large = size === "lg";
  const seats = variant === "seats";
  const filled = slots.filter((s) => s.member).length;
  const dashed = `border border-dashed text-center ${closed ? "border-border text-muted" : "border-line2 text-ink2"}`;
  const type = large ? "text-meta" : "text-xs";
  const width = seats ? (large ? "w-28" : "w-18") : "min-w-14 max-w-40";
  const openShape = seats ? `rounded-md px-1 ${large ? "h-20" : "h-12"}` : `rounded-full px-3 ${large ? "h-14" : "h-10"}`;
  const faceBox = seats ? (large ? "h-20" : "h-12") : large ? "h-14" : "h-10";

  return (
    <ul aria-label={`${filled} of ${slots.length} slots filled`} className={`flex flex-wrap items-start ${large ? "gap-3" : "gap-2"}`}>
      {slots.map((s) => (
        <li key={s.id} className={`flex flex-col items-center gap-1 ${width}`}>
          {s.member ? (
            <>
              <span className={`flex items-center justify-center ${faceBox} ${wasOpen.has(s.id) ? "animate-slot-in" : ""}`}>
                <Avatar url={s.member.avatar_url} name={s.member.name} size={large ? (seats ? "2xl" : "xl") : seats ? "xl" : "lg"} ring={s.member.ring ?? null} />
              </span>
              <span className="sr-only">{s.member.name}, </span>
              <span className={`line-clamp-2 w-full text-center leading-tight break-words ${type} ${s.member.you ? "font-semibold text-accent" : "text-ink2"}`}>
                {s.member.you && <span className="sr-only">You, </span>}
                {s.role}
              </span>
            </>
          ) : (
            <span className={`flex w-full items-center justify-center ${openShape} ${dashed}`}>
              <span className={`line-clamp-2 leading-tight break-words ${type}`}>{s.role}</span>
              <span className="sr-only">, {closed ? "not recruiting" : "open"}</span>
            </span>
          )}
        </li>
      ))}
    </ul>
  );
}
