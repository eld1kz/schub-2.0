"use client";

import { useState, useTransition } from "react";
import { inviteToTeam } from "@/app/actions";
import { ErrorText, buttonClass } from "@/components/ui";

// Sends an invitation for one role; the page then shows them under "Invited". Errors (like the daily cap) show below.
export function InviteButton({ teamId, personId, personName, role }: { teamId: string; personId: string; personName: string; role: string }) {
  const [error, setError] = useState("");
  const [sending, start] = useTransition();
  return (
    <span className="flex flex-col items-end gap-1">
      <button
        type="button"
        disabled={sending}
        aria-label={`Invite ${personName} as ${role}`}
        onClick={() =>
          start(async () => {
            const result = await inviteToTeam(teamId, personId, role);
            setError(result.error ?? "");
          })
        }
        className={buttonClass({ variant: "accent", size: "sm" })}
      >
        {sending ? "Inviting..." : "Invite"}
      </button>
      {error && <ErrorText as="span" className="max-w-note text-right">{error}</ErrorText>}
    </span>
  );
}
