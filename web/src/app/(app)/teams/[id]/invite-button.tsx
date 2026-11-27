"use client";

import { inviteToTeam } from "@/app/actions";
import { ActionButton } from "@/components/ui";

// Sends an invitation for one role; the page then shows them under "Invited". Errors (like the daily cap) show below.
export function InviteButton({ teamId, personId, personName, role }: { teamId: string; personId: string; personName: string; role: string }) {
  return (
    <ActionButton variant="accent" size="sm" aria-label={`Invite ${personName} as ${role}`} action={() => inviteToTeam(teamId, personId, role)}>
      Invite
    </ActionButton>
  );
}
