"use client";

import { useFormStatus } from "react-dom";
import { setOpenToTeam } from "@/app/actions";

function SwitchButton({ open }: { open: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button
      aria-pressed={open}
      disabled={pending}
      className="flex h-8.5 items-center gap-2 rounded-md border border-line2 px-3 text-sm font-medium hover:border-muted disabled:opacity-60"
    >
      <span aria-hidden className={`h-2 w-2 rounded-full ${open ? "bg-open" : "bg-line2"}`} />
      Open to a team
    </button>
  );
}

// The owner's one-tap switch in the profile hero: pressed while they're open to a team
export function OpenToTeamSwitch({ open }: { open: boolean }) {
  return (
    <form action={setOpenToTeam.bind(null, !open)} className="flex items-center gap-2">
      <SwitchButton open={open} />
      <span className="hidden text-sm text-muted sm:inline">{open ? "On: a green ring on your photo, and teams find you in People" : "Off: turn on so teams can find you"}</span>
    </form>
  );
}
