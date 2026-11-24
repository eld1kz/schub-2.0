"use client";

import { useState, useTransition, type FormEvent } from "react";
import { addOpportunity } from "@/app/actions";
import { opportunityTypes } from "@/lib/opportunities";
import { FieldError } from "../../u/[id]/edit-dialog";
import { DateField } from "./date-field";
import { ErrorText, Field, Input, PageHeader, Select, Textarea, buttonClass } from "@/components/ui";

const typeOptions = Object.entries(opportunityTypes).map(([value, label]) => ({ value, label }));

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
      <PageHeader title="Add an opportunity" description="It goes live right away. Real, upcoming events only." ruled className="pb-6" />

      <div className="space-y-4 py-6">
        <Field id="title" label="Title" required>
          <Input id="title" name="title" required minLength={3} maxLength={200} placeholder="Microsoft Imagine Cup 2027" />
          <FieldError field="title" message={serverError("title")} />
        </Field>

        <Field id="type" label="Type" required>
          <Select id="type" name="type" placeholder="Choose a type" value={type} onChange={setType} options={typeOptions} />
        </Field>

        <Field id="url" label="Link" required>
          <Input id="url" name="url" type="url" required placeholder="https://" />
          <p className="mt-1.5 text-meta text-muted">The official page. We check that it opens.</p>
          <FieldError field="url" message={serverError("url")} />
        </Field>

        <Field id="organizer" label="Organizer" optional>
          <Input id="organizer" name="organizer" maxLength={120} placeholder="Microsoft for Startups" />
        </Field>

        <Field id="location" label="Location" optional>
          <div className="flex items-center gap-4">
            <Input id="location" name="location" maxLength={120} placeholder="Seoul" className="min-w-0 flex-1" />
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
          <Textarea id="description" name="description" rows={4} maxLength={3000} placeholder="Who can join, what you build, prizes. A few lines is enough." />
        </Field>
      </div>

      <div className="flex flex-col gap-3 border-t border-border pt-4 sm:flex-row-reverse sm:items-center sm:justify-between">
        <button disabled={saving} className={buttonClass({ size: "touch", full: true })}>{saving ? "Checking the link..." : "Add opportunity"}</button>
        {error && !error.field && <ErrorText size="sm">{error.message}</ErrorText>}
      </div>
    </form>
  );
}
