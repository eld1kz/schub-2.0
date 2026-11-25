"use client";

import { useState, useTransition, type FormEvent } from "react";
import { addOpportunity, updateOpportunity } from "@/app/actions";
import type { Prefill } from "@/lib/link-preview";
import { opportunityTypes } from "@/lib/opportunities";
import { FieldError } from "../../u/[id]/edit-dialog";
import { DateField } from "./date-field";
import { LinkField } from "./link-field";
import { PlaceFields, type Option, type PlaceValues } from "./place-fields";
import { ErrorText, Field, Input, PageHeader, Select, Textarea, buttonClass } from "@/components/ui";

const typeOptions = Object.entries(opportunityTypes).map(([value, label]) => ({ value, label }));

export type OpportunityValues = PlaceValues & {
  title: string; type: string; url: string; organizer: string; description: string; deadline: string; starts_at: string; ends_at: string;
};

const blank: OpportunityValues = {
  title: "", type: "", url: "", organizer: "", description: "", deadline: "", starts_at: "", ends_at: "",
  city: "", country: "", online: false, languages: [], eligibility: "anyone", eligibility_note: "",
};

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
      <PageHeader
        title={edit ? "Edit opportunity" : "Add an opportunity"}
        description={edit ? (edit.pending ? "Imported and waiting for review. Saving publishes it." : "Saving keeps the importer from changing it.") : "It goes live right away. Real, upcoming events only."}
        ruled
        className="pb-6"
      />

      <div className="space-y-4 py-6">
        <LinkField initial={values.url} onFill={edit ? undefined : onFill} error={serverError("url")} />

        <div key={filled} className="space-y-4">
          <Field id="title" label="Title" required>
            <Input id="title" name="title" required minLength={3} maxLength={200} defaultValue={values.title} placeholder="Microsoft Imagine Cup 2027" />
            <FieldError field="title" message={serverError("title")} />
          </Field>

          <Field id="type" label="Type" required>
            <Select id="type" name="type" placeholder="Choose a type" value={type} onChange={setType} options={typeOptions} />
          </Field>

          <Field id="organizer" label="Organizer" optional>
            <Input id="organizer" name="organizer" maxLength={120} defaultValue={values.organizer} placeholder="Microsoft for Startups" />
          </Field>

          <PlaceFields initial={values} countries={countries} countryError={serverError("country")} />

          <DateField name="deadline" label="Deadline" initial={values.deadline} onChange={(deadline) => setDates((d) => ({ ...d, deadline }))} error={deadlineError || serverError("deadline")} />
          <DateField name="starts_at" label="Start date" initial={values.starts_at} onChange={(starts_at) => setDates((d) => ({ ...d, starts_at }))} error={serverError("starts_at")} />
          <DateField name="ends_at" label="End date" initial={values.ends_at} onChange={(ends_at) => setDates((d) => ({ ...d, ends_at }))} error={endError || serverError("ends_at")} />

          <Field id="description" label="Description" optional>
            <Textarea id="description" name="description" rows={4} maxLength={3000} defaultValue={values.description} placeholder="Who can join, what you build, prizes. A few lines is enough." />
          </Field>
        </div>
      </div>

      <div className="flex flex-col gap-3 border-t border-border pt-4 sm:flex-row-reverse sm:items-center sm:justify-between">
        <button disabled={saving} className={buttonClass({ size: "touch", full: true })}>{saving ? "Checking the link..." : submit}</button>
        {error && !error.field && <ErrorText size="sm">{error.message}</ErrorText>}
      </div>
    </form>
  );
}
