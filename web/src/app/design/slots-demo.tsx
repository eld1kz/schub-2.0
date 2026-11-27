"use client";

import { useState } from "react";
import { Button, MonoLabel, TeamSlots, type Slot } from "@/components/ui";

const person = (name: string, extra: Partial<NonNullable<Slot["member"]>> = {}) => ({ name, avatar_url: "", ...extra });
const start: Slot[] = [
  { id: "owner", role: "Lead", member: person("Minji Placeholder", { you: true }) },
  { id: "be", role: "Backend", member: person("Jisoo Sampleton", { ring: "connection" }) },
  { id: "design", role: "Designer" },
  { id: "fe", role: "Frontend" },
  { id: "ml", role: "ML / AI" },
];
const joiners = [person("Minho Ipsum", { ring: "open" }), person("Ara Lorem"), person("Kai Testerson")];
// The most a team can have (the owner and 10 roles), with long, typed-in and Hangul names
const crowd: Slot[] = [
  start[0],
  { id: "1", role: "백엔드 개발자", member: person("김지우") },
  ...["프론트엔드 개발자", "Product Management", "Hardware and embedded systems", "Marketing", "Data", "iOS", "Android", "Pitch", "DevOps"].map((role) => ({ id: role, role })),
];

export function SlotsDemo() {
  const [slots, setSlots] = useState(start);
  const next = slots.findIndex((s) => !s.member);
  const fill = () => setSlots(slots.map((s, i) => (i === next ? { ...s, member: joiners[(next - 2) % joiners.length] } : s)));

  return (
    <div className="flex flex-col gap-8">
      <div className="flex gap-2">
        <Button type="button" size="sm" onClick={fill} disabled={next === -1}>Fill a role</Button>
        <Button type="button" variant="secondary" size="sm" onClick={() => setSlots(start)}>Reset</Button>
      </div>
      {(["seats", "pills"] as const).map((variant, i) => (
        <div key={variant} className="flex flex-col gap-6 border-t border-line2 pt-4">
          <MonoLabel as="p" tone="accent">{i === 0 ? "A · Seats: equal tiles" : "B · Pills: as wide as the role"}</MonoLabel>
          <div className="flex flex-col gap-2">
            <p className="text-meta text-muted">Team row</p>
            <div className="border-y border-border py-3">
              <p className="pb-2 text-lg font-semibold">AI study buddy</p>
              <TeamSlots slots={slots} variant={variant} />
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <p className="text-meta text-muted">Team and event page</p>
            <TeamSlots slots={slots} variant={variant} size="lg" />
          </div>
          <div className="flex flex-col gap-2">
            <p className="text-meta text-muted">Event over, not recruiting</p>
            <TeamSlots slots={start} variant={variant} closed />
          </div>
          <div className="flex max-w-narrow flex-col gap-2">
            <p className="text-meta text-muted">Owner and 10 roles, long and Hangul names</p>
            <TeamSlots slots={crowd} variant={variant} />
          </div>
          <div className="flex flex-col gap-2">
            <p className="text-meta text-muted">Story image (a sketch; the real one is drawn separately)</p>
            <div className="flex h-120 w-68 flex-col justify-between rounded-lg border border-line2 p-6">
              <p className="text-base font-semibold">schub</p>
              <div className="flex flex-col gap-4">
                <p className="text-2xl font-semibold">We need {slots.filter((s) => !s.member).length || "no"} more people</p>
                <TeamSlots slots={slots} variant={variant} />
                <p className="text-sm text-ink2">AI study buddy</p>
              </div>
              <p className="text-meta text-muted">Scan to join on Schub</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
