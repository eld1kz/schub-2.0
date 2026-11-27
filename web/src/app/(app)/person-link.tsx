"use client";

import { useState, type ComponentProps } from "react";
import Link from "next/link";
import type { PersonPreview } from "@/app/people/preview/[id]/route";
import { ConnectButton } from "./connect-button";
import { Avatar, Chip, ChipList, HoverCard, Skeleton } from "@/components/ui";

// A link to someone's profile that previews them on hover or keyboard focus: photo, headline, top skills, Connect.
// Loaded when the card first opens, and again each time after.
export function PersonLink({ id, ...props }: Omit<ComponentProps<typeof Link>, "href"> & { id: string }) {
  const [person, setPerson] = useState<PersonPreview | null>(null);
  async function load() {
    const response = await fetch(`/people/preview/${id}`).catch(() => null);
    if (response?.ok) setPerson(await response.json());
  }
  const card = person?.self ? null : (
    <div className="flex w-72 flex-col gap-3 rounded-lg border border-line2 bg-background p-4 shadow-float">
      {person ? (
        <>
          <div className="flex items-center gap-3">
            <Avatar url={person.avatar_url} name={person.name} size="xl" ring={person.open_to_collaborate ? "open" : null} />
            <div className="min-w-0">
              <p className="truncate text-base font-semibold tracking-snug">{person.name || "Unnamed"}</p>
              {person.headline && <p className="text-meta text-ink2">{person.headline}</p>}
            </div>
          </div>
          {person.skills.length > 0 && <ChipList>{person.skills.map((s) => <Chip key={s}>{s}</Chip>)}</ChipList>}
          <ConnectButton profileId={id} status={person.status ?? undefined} isGuest={person.guest} size="sm" onConnected={() => setPerson({ ...person, status: "pending" })} />
        </>
      ) : (
        <>
          <Skeleton className="h-11 w-full" />
          <Skeleton className="h-5 w-3/5" />
        </>
      )}
    </div>
  );
  return (
    <HoverCard card={card} onOpen={load}>
      <Link href={`/u/${id}`} {...props} />
    </HoverCard>
  );
}
