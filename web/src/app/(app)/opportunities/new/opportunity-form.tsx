"use client";

import { useState, useTransition, type FormEvent, type ReactNode } from "react";
import { addOpportunity, updateOpportunity } from "@/app/actions";
import type { Prefill } from "@/lib/link-preview";
import { opportunityTypes } from "@/lib/opportunities";
import { Select } from "../../select";
import { FieldError } from "../../u/[id]/edit-dialog";
import { DateField } from "./date-field";
import { LinkField } from "./link-field";
import { PlaceFields, type Option, type PlaceValues } from "./place-fields";

const input = "input h-11 sm:h-10";
const typeOptions = Object.entries(opportunityTypes).map(([value, label]) => ({ value, label }));

export type OpportunityValues = PlaceValues & {
  title: string; type: string; url: string; organizer: string; description: string; deadline: string; starts_at: string; ends_at: string;
};

const blank: OpportunityValues = {
  title: "", type: "", url: "", organizer: "", description: "", deadline: "", starts_at: "", ends_at: "",
  city: "", country: "", online: false, languages: [], eligibility: "anyone", eligibility_note: "",
};

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
// Adding: "Fill from link" fills every field from the event's page. Editing (admins, `edit`): starts from the row.
export function OpportunityForm({ edit, countries }: { edit?: { id: string; values: OpportunityValues; pending: boolean }; countries: Option[] }) {
  const [values, setValues] = useState(edit?.values ?? blank);
  // A fill replaces the fields, so they start again from the new values
  const [filled, setFilled] = useState(0);
  const [type, setType] = useState(values.type);
  const [dates, setDates] = useState({ deadline: values.deadline, starts_at: values.starts_at, ends_at: values.ends_at });
  const [error, setError] = useState<{ message: string; field?: string } | null>(null);
  const [saving, startSave] = useTransition();

  // Same order the server checks: deadline on or before the start, end on or after the start (or deadline)
  const begins = dates.starts_at || dates.deadline;
  const deadlineError = dates.deadline && dates.starts_at && dates.deadline > dates.starts_at ? "The deadline should be on or before the start." : "";
  const endError = dates.ends_at && begins && dates.ends_at < begins ? "The end can't be before the start." : "";
  const serverError = (field: string) => (error?.field === field ? error.message : "");

  function onFill(prefill: Prefill, url: string) {
    const next = { ...blank, ...prefill, url, eligibility: "anyone", eligibility_note: "" };
    setValues(next);
    setType(next.type);
    setDates({ deadline: next.deadline, starts_at: next.starts_at, ends_at: next.ends_at });
    setFilled((n) => n + 1);
  }

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    setError(null);
    // On success the action opens the opportunity's page
    startSave(async () => {
      const result = edit ? await updateOpportunity(edit.id, formData) : await addOpportunity(formData);
      if (result.error) setError({ message: result.error, field: result.field });
    });
  }

  const submit = edit ? (edit.pending ? "Save and publish" : "Save") : "Add opportunity";
  return (
    <form onSubmit={onSubmit} onInput={() => setError(null)} className="max-w-form">
      <div className="flex flex-col gap-1.5 border-b border-line2 pb-6">
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl sm:tracking-tighter">{edit ? "Edit opportunity" : "Add an opportunity"}</h1>
        <p className="text-base text-ink2">
          {edit ? (edit.pending ? "Imported and waiting for review. Saving publishes it." : "Saving keeps the importer from changing it.") : "It goes live right away. Real, upcoming events only."}
        </p>
      </div>

      <div className="space-y-4 py-6">
        <LinkField initial={values.url} onFill={edit ? undefined : onFill} error={serverError("url")} />

        <div key={filled} className="space-y-4">
          <Field id="title" label="Title" required>
            <input id="title" name="title" required minLength={3} maxLength={200} defaultValue={values.title} placeholder="Microsoft Imagine Cup 2027" className={input} />
            <FieldError field="title" message={serverError("title")} />
          </Field>

          <Field id="type" label="Type" required>
            <Select id="type" name="type" placeholder="Choose a type" value={type} onChange={setType} options={typeOptions} />
          </Field>

          <Field id="organizer" label="Organizer" optional>
            <input id="organizer" name="organizer" maxLength={120} defaultValue={values.organizer} placeholder="Microsoft for Startups" className={input} />
          </Field>

          <PlaceFields initial={values} countries={countries} countryError={serverError("country")} />

          <DateField name="deadline" label="Deadline" initial={values.deadline} onChange={(deadline) => setDates((d) => ({ ...d, deadline }))} error={deadlineError || serverError("deadline")} />
          <DateField name="starts_at" label="Start date" initial={values.starts_at} onChange={(starts_at) => setDates((d) => ({ ...d, starts_at }))} error={serverError("starts_at")} />
          <DateField name="ends_at" label="End date" initial={values.ends_at} onChange={(ends_at) => setDates((d) => ({ ...d, ends_at }))} error={endError || serverError("ends_at")} />

          <Field id="description" label="Description" optional>
            <textarea id="description" name="description" rows={4} maxLength={3000} defaultValue={values.description} placeholder="Who can join, what you build, prizes. A few lines is enough." className="input resize-none leading-normal" />
          </Field>
        </div>
      </div>

      <div className="flex flex-col gap-3 border-t border-border pt-4 sm:flex-row-reverse sm:items-center sm:justify-between">
        <button disabled={saving} className="btn h-11 w-full sm:h-[38px] sm:w-auto">{saving ? "Checking the link..." : submit}</button>
        {error && !error.field && <p role="alert" className="text-sm text-danger">{error.message}</p>}
      </div>
    </form>
  );
}
