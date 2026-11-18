"use client";

import { useEffect, useRef, useState, type Ref } from "react";
import { formatPeriod } from "@/lib/portfolio";

const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const firstYear = 1990;
// End dates can be in the future, for internships that haven't finished
const yearsAhead = 5;

const years = (from: number) => Array.from({ length: from - firstYear + 1 }, (_, i) => String(from - i));

// A Month or Year dropdown in the input style, with its own chevron. Empty shows the placeholder in a muted color.
function Select({ label, placeholder, value, onChange, options, selectRef }: {
  label: string;
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  selectRef?: Ref<HTMLSelectElement>;
}) {
  return (
    <span className="relative block min-w-0">
      <select
        ref={selectRef}
        aria-label={label}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required
        className={`input cursor-pointer appearance-none pr-9 ${value ? "" : "text-muted"}`}
      >
        <option value="" disabled>{placeholder}</option>
        {options.map((o) => <option key={o.value} value={o.value} className="text-foreground">{o.label}</option>)}
      </select>
      <svg viewBox="0 0 16 16" aria-hidden className="pointer-events-none absolute top-1/2 right-3 h-4 w-4 -translate-y-1/2 fill-none stroke-muted" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
        <path d="m4 6 4 4 4-4" />
      </svg>
    </span>
  );
}

const monthOptions = months.map((m, i) => ({ value: String(i + 1).padStart(2, "0"), label: m }));
const yearOptions = (from: number) => years(from).map((y) => ({ value: y, label: y }));

// "2025-03" into its month and year, or empty for a new entry
const split = (value?: string) => ({ year: value?.slice(0, 4) ?? "", month: value?.slice(5, 7) ?? "" });

// Start and end as Month and Year dropdowns. They're sent as "start" and "end" in YYYY-MM, which the server
// stores as the 1st of the month. "I currently work here" hides the end, and the entry is saved without one.
export function PeriodFields({ start, end, current }: { start?: string; end?: string; current: boolean }) {
  const thisYear = new Date().getFullYear();
  const [isCurrent, setCurrent] = useState(current);
  const [from, setFrom] = useState(split(start));
  const [to, setTo] = useState(split(end));
  const endMonth = useRef<HTMLSelectElement>(null);

  const startValue = from.year && from.month ? `${from.year}-${from.month}` : "";
  const endValue = to.year && to.month ? `${to.year}-${to.month}` : "";
  // Same-length strings, so they compare as dates
  const endsTooEarly = !isCurrent && startValue !== "" && endValue !== "" && endValue < startValue;
  // "1 yr 9 mos", once the dates make a period
  const length = startValue && (isCurrent || (endValue && !endsTooEarly)) ? formatPeriod(`${startValue}-01`, isCurrent ? null : `${endValue}-01`).split(" · ")[1] : "";

  // Keeps the form from submitting while the end is before the start
  useEffect(() => {
    endMonth.current?.setCustomValidity(endsTooEarly ? "The end can't be before the start." : "");
  }, [endsTooEarly]);

  return (
    <>
      <input type="hidden" name="start" value={startValue} />
      <fieldset>
        <legend className="label">Start</legend>
        <div className="grid grid-cols-2 gap-3">
          <Select label="Start month" placeholder="Month" value={from.month} onChange={(month) => setFrom({ ...from, month })} options={monthOptions} />
          <Select label="Start year" placeholder="Year" value={from.year} onChange={(year) => setFrom({ ...from, year })} options={yearOptions(thisYear)} />
        </div>
      </fieldset>
      {!isCurrent && (
        <fieldset>
          <legend className="label">End</legend>
          <input type="hidden" name="end" value={endValue} />
          <div className="grid grid-cols-2 gap-3">
            <Select label="End month" placeholder="Month" value={to.month} onChange={(month) => setTo({ ...to, month })} options={monthOptions} selectRef={endMonth} />
            <Select label="End year" placeholder="Year" value={to.year} onChange={(year) => setTo({ ...to, year })} options={yearOptions(thisYear + yearsAhead)} />
          </div>
          {endsTooEarly && <p className="mt-1.5 text-[13px] text-red-600 dark:text-red-400">The end can&apos;t be before the start.</p>}
        </fieldset>
      )}
      <div className="flex items-center justify-between gap-4">
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="current" checked={isCurrent} onChange={(e) => setCurrent(e.target.checked)} className="h-4 w-4 accent-[var(--accent)]" />
          I currently work here
        </label>
        {length && <span className="font-mono text-[13px] font-medium text-ink2">{length}</span>}
      </div>
    </>
  );
}
