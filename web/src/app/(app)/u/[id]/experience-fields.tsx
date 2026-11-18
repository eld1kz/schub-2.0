"use client";

import { useEffect, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { EXPERIENCE_DESCRIPTION_MAX, EXPERIENCE_TYPES, type Experience } from "@/lib/portfolio";
import { knownSkills } from "@/lib/skills";
import { SkillPicker } from "../../profile/skill-picker";
import { FieldError } from "./edit-dialog";
import { Select } from "../../select";
import { PeriodFields } from "./period-fields";

const input = "input h-11 sm:h-10";
const typeOptions = EXPERIENCE_TYPES.map((t) => ({ value: t, label: t }));

function Field({ id, label, required = false, children }: { id: string; label: string; required?: boolean; children: ReactNode }) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium">
        {label}
        {required && <span aria-hidden className="ml-0.5 text-accent">*</span>}
      </label>
      {children}
    </div>
  );
}

// Enter in a one-line field moves to the next field instead of submitting. The skill search handles its own Enter.
function nextOnEnter(e: KeyboardEvent<HTMLDivElement>) {
  if (e.key !== "Enter" || e.defaultPrevented || !(e.target instanceof HTMLInputElement)) return;
  e.preventDefault();
  const fields = [...e.currentTarget.querySelectorAll<HTMLElement>("input:not([type=hidden]), select, textarea")].filter((f) => f.getClientRects().length > 0);
  fields[fields.indexOf(e.target) + 1]?.focus();
}

// The add/edit experience form: one column, one field per row. No `experience` starts empty.
export function ExperienceFields({ experience: e }: { experience?: Experience }) {
  const [type, setType] = useState(e?.type ?? "");
  const [description, setDescription] = useState(e?.description ?? "");
  const descriptionRef = useRef<HTMLTextAreaElement>(null);
  // Older entries can be longer than the limit; Save stays off until they're shortened
  const tooLong = description.length > EXPERIENCE_DESCRIPTION_MAX;

  useEffect(() => {
    descriptionRef.current?.setCustomValidity(tooLong ? "Too long" : "");
  }, [tooLong]);

  return (
    <div onKeyDown={nextOnEnter} className="space-y-5 py-6">
      <Field id="experience-role" label="Title" required>
        <input id="experience-role" name="role" defaultValue={e?.role} required maxLength={80} placeholder="Backend developer" className={input} />
        <FieldError field="role" />
      </Field>

      <Field id="experience-type" label="Type">
        <Select id="experience-type" name="type" placeholder="Choose a type" value={type} onChange={setType} options={typeOptions} required={false} />
      </Field>

      <Field id="experience-company" label="Organization" required>
        <input id="experience-company" name="company" defaultValue={e?.company} required maxLength={80} placeholder="Daangn, KU Robotics Club, ..." className={input} />
        <FieldError field="company" />
      </Field>

      <Field id="experience-location" label="Location">
        <div className="flex items-center gap-4">
          <input id="experience-location" name="location" defaultValue={e?.location} maxLength={80} placeholder="Seoul" className={`${input} min-w-0 flex-1`} />
          <label className="flex shrink-0 cursor-pointer items-center gap-2 text-sm text-ink2">
            <input type="checkbox" name="remote" defaultChecked={e?.remote} className="peer sr-only" />
            <span
              aria-hidden
              className="relative h-5 w-9 rounded-full bg-line2 transition-colors peer-checked:bg-accent peer-focus-visible:ring-2 peer-focus-visible:ring-accent peer-focus-visible:ring-offset-2 after:absolute after:top-0.5 after:left-0.5 after:h-4 after:w-4 after:rounded-full after:bg-background after:transition-transform peer-checked:after:translate-x-4"
            />
            Remote
          </label>
        </div>
      </Field>

      <PeriodFields start={e?.start_date.slice(0, 7)} end={e?.end_date?.slice(0, 7)} current={e ? !e.end_date : false} />

      <Field id="experience-description" label="Description">
        <textarea
          ref={descriptionRef}
          id="experience-description"
          name="description"
          rows={4}
          value={description}
          onChange={(ev) => setDescription(ev.target.value)}
          maxLength={EXPERIENCE_DESCRIPTION_MAX}
          placeholder="What did you build or do? One or two lines is enough."
          className="input resize-none leading-normal"
        />
        <div className="mt-1 flex justify-between gap-4">
          <FieldError field="description" message={tooLong ? `Keep it to ${EXPERIENCE_DESCRIPTION_MAX} characters or fewer.` : ""} />
          <span className={`ml-auto text-[13px] tabular-nums ${tooLong ? "text-red-600 dark:text-red-400" : "text-muted"}`}>
            {description.length}/{EXPERIENCE_DESCRIPTION_MAX}
          </span>
        </div>
      </Field>

      {/* The shared picker's search box, at least 44px tall on phones like the other fields */}
      <div className="[&_input[type=search]]:h-11 sm:[&_input[type=search]]:h-10">
        <label htmlFor="experience-skill-search" className="mb-1.5 block text-sm font-medium">
          Skills used <span className="font-normal text-muted">(optional)</span>
        </label>
        <SkillPicker id="experience-skill-search" defaultValue={knownSkills(e?.skills ?? [])} />
      </div>
    </div>
  );
}
