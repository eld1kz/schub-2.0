"use client";

import { useState, useTransition, type FormEvent, type ReactNode } from "react";
import { addOpportunity } from "@/app/actions";
import { opportunityTypes } from "@/lib/opportunities";
import { Select } from "../../select";
import { FieldError } from "../../u/[id]/edit-dialog";
import { DateField } from "./date-field";

const input = "input h-11 sm:h-10";
const typeOptions = Object.entries(opportunityTypes).map(([value, label]) => ({ value, label }));

function Field({ id, label, required = false, optional = false, children }: { id: string; label: string; required?: boolean; optional?: boolean; children: ReactNode }) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium">
        {label}
        {required && <span aria-hidden className="ml-0.5 text-accent">*</span>}
        {optional && <span className="font-normal text-muted"> (optional)</span>}
      </label>
      {children}
    </div>
  );
}

// One column, like the experience form. Server checks (link opens, not a duplicate, dates, 5 a day)
// come back with the field they belong to and show under it; the typed values stay.
export function OpportunityForm() {
  const [type, setType] = useState("");
  const [dates, setDates] = useState({ deadline: "", starts_at: "", ends_at: "" });
  const [error, setError] = useState<{ message: string; field?: string } | null>(null);
  const [saving, startSave] = useTransition();

  // Same order the server checks: deadline on or before the start, end on or after the start (or deadline)
  const begins = dates.starts_at || dates.deadline;
  const deadlineError = dates.deadline && dates.starts_at && dates.deadline > dates.starts_at ? "The deadline should be on or before the start." : "";
  const endError = dates.ends_at && begins && dates.ends_at < begins ? "The end can't be before the start." : "";
  const serverError = (field: string) => (error?.field === field ? error.message : "");

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    setError(null);
    // On success the action opens the new page
    startSave(async () => {
      const result = await addOpportunity(formData);
      if (result.error) setError({ message: result.error, field: result.field });
    });
  }

  return (
    <form onSubmit={onSubmit} onInput={() => setError(null)} className="max-w-form">
      <div className="flex flex-col gap-1.5 border-b border-line2 pb-6">
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl sm:tracking-tighter">Add an opportunity</h1>
        <p className="text-base text-ink2">It goes live right away. Real, upcoming events only.</p>
      </div>

      <div className="space-y-4 py-6">
        <Field id="title" label="Title" required>
          <input id="title" name="title" required minLength={3} maxLength={200} placeholder="Microsoft Imagine Cup 2027" className={input} />
          <FieldError field="title" message={serverError("title")} />
        </Field>

        <Field id="type" label="Type" required>
          <Select id="type" name="type" placeholder="Choose a type" value={type} onChange={setType} options={typeOptions} />
        </Field>

        <Field id="url" label="Link" required>
          <input id="url" name="url" type="url" required placeholder="https://" className={input} />
          <p className="mt-1.5 text-meta text-muted">The official page. We check that it opens.</p>
          <FieldError field="url" message={serverError("url")} />
        </Field>

        <Field id="organizer" label="Organizer" optional>
          <input id="organizer" name="organizer" maxLength={120} placeholder="Microsoft for Startups" className={input} />
        </Field>

        <Field id="location" label="Location" optional>
          <div className="flex items-center gap-4">
            <input id="location" name="location" maxLength={120} placeholder="Seoul" className={`${input} min-w-0 flex-1`} />
            <label className="flex shrink-0 cursor-pointer items-center gap-2 text-sm text-ink2">
              <input type="checkbox" name="online" className="peer sr-only" />
              <span
                aria-hidden
                className="relative h-5 w-9 rounded-full bg-line2 transition-colors peer-checked:bg-accent peer-focus-visible:ring-2 peer-focus-visible:ring-accent peer-focus-visible:ring-offset-2 after:absolute after:top-0.5 after:left-0.5 after:h-4 after:w-4 after:rounded-full after:bg-background after:transition-transform peer-checked:after:translate-x-4"
              />
              Online
            </label>
          </div>
        </Field>

        <DateField name="deadline" label="Deadline" onChange={(deadline) => setDates({ ...dates, deadline })} error={deadlineError || serverError("deadline")} />
        <DateField name="starts_at" label="Start date" onChange={(starts_at) => setDates({ ...dates, starts_at })} error={serverError("starts_at")} />
        <DateField name="ends_at" label="End date" onChange={(ends_at) => setDates({ ...dates, ends_at })} error={endError || serverError("ends_at")} />

        <Field id="description" label="Description" optional>
          <textarea id="description" name="description" rows={4} maxLength={3000} placeholder="Who can join, what you build, prizes. A few lines is enough." className="input resize-none leading-normal" />
        </Field>
      </div>

      <div className="flex flex-col gap-3 border-t border-border pt-4 sm:flex-row-reverse sm:items-center sm:justify-between">
        <button disabled={saving} className="btn h-11 w-full sm:h-[38px] sm:w-auto">{saving ? "Checking the link..." : "Add opportunity"}</button>
        {error && !error.field && <p role="alert" className="text-sm text-danger ">{error.message}</p>}
      </div>
    </form>
  );
}
