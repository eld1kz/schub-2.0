"use client";

import { PersonLink } from "./person-link";
import { TeamSlots, type Slot } from "@/components/ui";

// A team's slots in the app: each member links to their profile, with the hover preview
export function TeamRowSlots(props: { slots: Slot[]; size?: "sm" | "lg"; closed?: boolean }) {
  return (
    <TeamSlots
      {...props}
      wrapMember={(id, content) => (
        <PersonLink id={id} className="flex w-full flex-col items-center gap-1 rounded-md">
          {content}
        </PersonLink>
      )}
    />
  );
}
