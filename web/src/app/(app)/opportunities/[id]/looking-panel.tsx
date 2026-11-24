"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { findTeam, lookForTeam, stopLooking } from "@/app/actions";
import { EditDialog } from "../../u/[id]/edit-dialog";

const noteMax = 300;

// "Find a team": says you're looking for a team for the event, then shows who's recruiting and who else is looking.
// On the event's page that's a scroll down; from a list it opens the event's page there.
export function FindTeamButton({ opportunityId, onPage }: { opportunityId: string; onPage: boolean }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [saving, startSave] = useTransition();

  function onClick() {
    startSave(async () => {
      const result = await findTeam(opportunityId);
      setError(result.error ?? "");
      if (result.error) return;
      if (onPage) document.getElementById("teams")?.scrollIntoView({ behavior: "smooth" });
      else router.push(`/opportunities/${opportunityId}#teams`);
    });
  }

  return (
    <span className="flex flex-col gap-1">
      <button type="button" onClick={onClick} disabled={saving} className="btn h-9 px-4">{saving ? "Adding you..." : "Find a team"}</button>
      {error && <span role="alert" className="text-meta text-danger ">{error}</span>}
    </span>
  );
}

// Once you're looking for a team: your note, to edit, and a way to stop
export function LookingNote({ opportunityId, note }: { opportunityId: string; note: string }) {
  return (
    <div className="flex min-w-0 flex-wrap items-center gap-x-4 gap-y-2">
      <p className="flex items-center gap-2 text-base font-semibold">
        <span aria-hidden className="h-2.5 w-2.5 rounded-full bg-accent" />
        You&apos;re looking for a team
      </p>
      <EditDialog title="Edit your note" trigger="action" label="Edit note" cta="Edit note" done="Note saved" save={lookForTeam.bind(null, opportunityId)} tall>
        <div className="space-y-2 py-6">
          <label htmlFor="looking-note" className="mb-1.5 block text-sm font-medium">What you&apos;d bring to a team</label>
          <input id="looking-note" name="note" defaultValue={note} maxLength={noteMax} placeholder="Frontend dev, want to do the AI track" className="input h-11 bg-background sm:h-10" />
          <p className="text-meta text-muted">Up to {noteMax} characters. Shown to others looking and to teams.</p>
        </div>
      </EditDialog>
      <form action={stopLooking.bind(null, opportunityId)}>
        <button className="text-sm text-ink2 hover:text-foreground">Leave</button>
      </form>
      <p className="basis-full text-sm text-ink2">{note ? <>&ldquo;{note}&rdquo;</> : "No note yet. Add one so teams know what you'd bring."}</p>
    </div>
  );
}
