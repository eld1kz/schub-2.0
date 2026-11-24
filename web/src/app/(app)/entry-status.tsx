"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { setEntryStatus } from "@/app/actions";
import { ENTRY_STATUSES, type EntryStatus } from "@/lib/teams";
import { Select } from "./select";

const options = Object.entries(ENTRY_STATUSES).map(([value, label]) => ({ value, label }));

// How far a team got in an event, as a small label: on team rows for that event, and for anyone but the owner
export function EntryStatusLabel({ status }: { status: EntryStatus }) {
  return <span className="font-mono text-xs font-medium tracking-wide text-ink2 uppercase">{ENTRY_STATUSES[status]}</span>;
}

// The owner moves the entry along: Going, Registered, Submitted, Placed. While it's going or registered, the official
// page (where people register) is a click away; once placed, so is adding the award to your profile.
export function EntryStatusControl({ teamId, teamTitle, event, status, userId }: {
  teamId: string;
  teamTitle: string;
  event: { id: string; title: string; url: string };
  status: EntryStatus;
  userId: string;
}) {
  const [value, setValue] = useState<string>(status);
  const [error, setError] = useState("");
  const [saving, startSave] = useTransition();

  function change(next: string) {
    const before = value;
    setValue(next);
    startSave(async () => {
      const result = await setEntryStatus(teamId, event.id, next);
      if (result.error) setValue(before);
      setError(result.error ?? "");
    });
  }

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <div className={`w-40 ${saving ? "opacity-60" : ""}`}>
          <Select label={`Status of ${teamTitle} for ${event.title}`} placeholder="Status" value={value} onChange={change} options={options} small />
        </div>
        {(value === "going" || value === "registered") && event.url && (
          <a href={event.url} target="_blank" rel="noreferrer" className="text-sm font-semibold text-accent hover:underline">Official registration page ↗</a>
        )}
        {value === "placed" && (
          <Link href={`/u/${userId}#awards`} className="text-sm font-semibold text-accent hover:underline">Add the award to your profile</Link>
        )}
      </div>
      {error && <p role="alert" className="text-meta text-danger ">{error}</p>}
    </div>
  );
}
