import { setOpenToTeam } from "@/app/actions";
import { SubmitButton } from "@/components/ui";

// The owner's one-tap switch in the profile hero: pressed while they're open to a team
export function OpenToTeamSwitch({ open }: { open: boolean }) {
  return (
    <form action={setOpenToTeam.bind(null, !open)} className="flex items-center gap-2">
      <SubmitButton variant="bare" aria-pressed={open} className="flex h-8.5 items-center gap-2 rounded-md border border-line2 px-3 text-sm font-medium hover:border-muted">
        <span aria-hidden className={`h-2 w-2 shrink-0 rounded-full transition-colors ${open ? "bg-open" : "bg-line2"}`} />
        Open to a team
      </SubmitButton>
      <span className="hidden text-sm text-muted sm:inline">{open ? "On: a green ring on your photo, and teams find you in People" : "Off: turn on so teams can find you"}</span>
    </form>
  );
}
