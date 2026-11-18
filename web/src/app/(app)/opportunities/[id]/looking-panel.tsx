"use client";

import { useState, useTransition, type FormEvent } from "react";
import { lookForTeam, stopLooking } from "@/app/actions";
import { EditDialog } from "../../u/[id]/edit-dialog";

const noteMax = 300;

function NoteField({ defaultValue = "" }: { defaultValue?: string }) {
  return (
    <input id="looking-note" name="note" defaultValue={defaultValue} maxLength={noteMax} placeholder="Frontend dev, want to do the AI track" className="input h-11 bg-background sm:h-10" />
  );
}

// The page's main action: say you're looking for a team, with a short note. Once you have, edit the note or leave.
export function LookingPanel({ opportunityId, mine }: { opportunityId: string; mine?: { note: string } }) {
  const [error, setError] = useState("");
  const [saving, startSave] = useTransition();

  // Not a form `action`: React would clear the note after it, even when saving failed
  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    startSave(async () => {
      const result = await lookForTeam(opportunityId, formData);
      setError(result.error ?? "");
    });
  }

  if (mine) {
    return (
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 flex-col gap-1">
          <p className="flex items-center gap-2 text-lg font-semibold">
            <span aria-hidden className="h-2.5 w-2.5 rounded-full bg-accent" />
            You&apos;re looking for a team
          </p>
          <p className="text-[15px] text-ink2">{mine.note || "No note yet. Add one so teams know what you'd bring."}</p>
        </div>
        <div className="flex shrink-0 items-center gap-4">
          <EditDialog title="Edit your note" trigger="action" label="Edit note" cta="Edit note" done="Note saved" save={lookForTeam.bind(null, opportunityId)} tall>
            <div className="space-y-2 py-6">
              <label htmlFor="looking-note" className="mb-1.5 block text-sm font-medium">What you&apos;d bring to a team</label>
              <NoteField defaultValue={mine.note} />
              <p className="text-[13px] text-muted">Up to {noteMax} characters. Shown to others looking and to teams.</p>
            </div>
          </EditDialog>
          <form action={stopLooking.bind(null, opportunityId)}>
            <button className="text-sm text-ink2 hover:text-foreground">Leave</button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-3">
      <div className="flex flex-col gap-1">
        <h2 className="text-lg font-semibold">Looking for a team for this?</h2>
        <p className="text-[15px] text-ink2">Add yourself so teams and other people looking can find you.</p>
      </div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
        <div className="min-w-0 flex-1">
          <label htmlFor="looking-note" className="sr-only">What you&apos;d bring (optional)</label>
          <NoteField />
          {error && <p role="alert" className="mt-1.5 text-[13px] text-red-600 dark:text-red-400">{error}</p>}
        </div>
        <button disabled={saving} className="btn h-11 w-full sm:h-10 sm:w-auto">{saving ? "Saving..." : "I'm looking for a team"}</button>
      </div>
    </form>
  );
}
