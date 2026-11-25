"use client";

import { useEffect, useRef, useState } from "react";
import { FieldError } from "../../u/[id]/edit-dialog";
import { FieldLabel, Select } from "@/components/ui";

const monthOptions = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"].map((m, i) => ({ value: String(i + 1).padStart(2, "0"), label: m }));
const yearsAhead = 3;

const daysIn = (year: string, month: string) => (year && month ? new Date(Date.UTC(Number(year), Number(month), 0)).getUTCDate() : 31);
const pad = (n: number) => String(n).padStart(2, "0");

// An exact, optional date as Month, Day and Year dropdowns, sent as `name` in YYYY-MM-DD.
// A half-picked date blocks the form; so does `error`, a check from the form (like dates out of order).
// `initial` (YYYY-MM-DD) is where it starts, for a form filled from a link or an edit.
export function DateField({ name, label, onChange, error, initial = "" }: { name: string; label: string; onChange: (value: string) => void; error?: string; initial?: string }) {
  const thisYear = new Date().getFullYear();
  const [parts, setParts] = useState(() => {
    const [year = "", month = "", day = ""] = /^\d{4}-\d{2}-\d{2}$/.test(initial) ? initial.split("-") : [];
    return { year, month, day };
  });
  const first = useRef<HTMLSelectElement>(null);

  const filled = [parts.year, parts.month, parts.day].filter(Boolean).length;
  const value = filled === 3 ? `${parts.year}-${parts.month}-${parts.day}` : "";
  const partial = filled > 0 && filled < 3;
  const message = partial ? "Pick the month, day and year, or clear them." : error;

  useEffect(() => {
    first.current?.setCustomValidity(message ?? "");
  }, [message]);

  function update(next: Partial<typeof parts>) {
    const merged = { ...parts, ...next };
    // A month change can shorten it: Jan 31 becomes Feb 28
    if (merged.day && Number(merged.day) > daysIn(merged.year, merged.month)) merged.day = pad(daysIn(merged.year, merged.month));
    setParts(merged);
    onChange([merged.year, merged.month, merged.day].every(Boolean) ? `${merged.year}-${merged.month}-${merged.day}` : "");
  }

  const days = Array.from({ length: daysIn(parts.year, parts.month) }, (_, i) => ({ value: pad(i + 1), label: String(i + 1) }));
  // An earlier year that's already set (editing an event that started last year) stays pickable
  const years = [...new Set([parts.year, ...Array.from({ length: yearsAhead + 1 }, (_, i) => String(thisYear + i))].filter(Boolean))].sort().map((y) => ({ value: y, label: y }));

  return (
    <fieldset>
      <FieldLabel as="legend">{label}</FieldLabel>
      <input type="hidden" name={name} value={value} />
      <div className="grid grid-cols-3 gap-3">
        <Select label={`${label} month`} placeholder="Month" value={parts.month} onChange={(month) => update({ month })} options={monthOptions} selectRef={first} required={false} />
        <Select label={`${label} day`} placeholder="Day" value={parts.day} onChange={(day) => update({ day })} options={days} required={false} />
        <Select label={`${label} year`} placeholder="Year" value={parts.year} onChange={(year) => update({ year })} options={years} required={false} />
      </div>
      <FieldError field={name} message={message} />
    </fieldset>
  );
}
