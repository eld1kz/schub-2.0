"use client";

import { useState } from "react";
import { Button, TeamSlots, type Slot } from "@/components/ui";

const person = (name: string, extra: Partial<NonNullable<Slot["member"]>> = {}) => ({ id: name, name, avatar_url: "", ...extra });
const start: Slot[] = [
  { id: "owner", role: "Lead", filled: true, member: person("Minji Placeholder", { you: true }) },
  { id: "be", role: "Backend", filled: true, member: person("Jisoo Sampleton", { ring: "connection" }) },
  { id: "design", role: "Designer", filled: false },
  { id: "fe", role: "Frontend", filled: false },
  { id: "ml", role: "ML / AI", filled: false },
];
const joiners = [person("Minho Ipsum", { ring: "open" }), person("Ara Lorem"), person("Kai Testerson")];
// The most a team can have (the owner and 10 roles), with long, typed-in and Hangul names
const crowd: Slot[] = [
  start[0],
  { id: "1", role: "백엔드 개발자", filled: true, member: person("김지우") },
  ...["프론트엔드 개발자", "Product Management", "Hardware and embedded systems", "Marketing", "Data", "iOS", "Android", "Pitch", "DevOps"].map((role) => ({ id: role, role, filled: false })),
];

export function SlotsDemo() {
  const [slots, setSlots] = useState(start);
  const next = slots.findIndex((s) => !s.filled);
  const fill = () => setSlots(slots.map((s, i) => (i === next ? { ...s, filled: true, member: joiners[(next - 2) % joiners.length] } : s)));

  return (
    <div className="flex flex-col gap-8">
      <div className="flex gap-2">
        <Button type="button" size="sm" onClick={fill} disabled={next === -1}>Fill a role</Button>
        <Button type="button" variant="secondary" size="sm" onClick={() => setSlots(start)}>Reset</Button>
      </div>
          <div className="flex flex-col gap-2">
            <p className="text-meta text-muted">Team row</p>
            <div className="border-y border-border py-3">
              <p className="pb-2 text-lg font-semibold">AI study buddy</p>
              <TeamSlots slots={slots} />
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <p className="text-meta text-muted">Team and event page</p>
            <TeamSlots slots={slots} size="lg" />
          </div>
          <div className="flex flex-col gap-2">
            <p className="text-meta text-muted">Event over, not recruiting</p>
            <TeamSlots slots={start} closed />
          </div>
          <div className="flex max-w-narrow flex-col gap-2">
            <p className="text-meta text-muted">Owner and 10 roles, long and Hangul names</p>
            <TeamSlots slots={crowd} />
          </div>
          <p className="text-meta text-muted">The story image draws the same seats: open /teams/&lt;id&gt;/story.png.</p>
    </div>
  );
}
