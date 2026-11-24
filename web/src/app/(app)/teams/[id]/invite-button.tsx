"use client";

import { useState, useTransition } from "react";
import { inviteToTeam } from "@/app/actions";

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
        className="h-9 rounded-md border border-accent px-3 text-meta font-semibold whitespace-nowrap text-accent hover:bg-accent-soft disabled:opacity-50"
      >
        {sending ? "Inviting..." : "Invite"}
      </button>
      {error && <span role="alert" className="max-w-note text-right text-meta text-danger ">{error}</span>}
    </span>
  );
}
