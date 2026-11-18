"use client";

import { useState } from "react";
import { formatPeriod } from "@/lib/portfolio";

// Start and end months. "I currently work here" swaps the end for "Present", and the entry is saved without one.
export function PeriodFields({ start: initialStart = "", end: initialEnd = "", current }: { start?: string; end?: string; current: boolean }) {
  const [isCurrent, setCurrent] = useState(current);
  const [start, setStart] = useState(initialStart);
  const [end, setEnd] = useState(initialEnd);
  // "1 yr 9 mos", once the dates make a period
  const length = start && (isCurrent || end >= start) ? formatPeriod(`${start}-01`, isCurrent ? null : `${end}-01`).split(" · ")[1] : "";

  return (
    <>
      <div className="grid grid-cols-2 gap-3">
        <label className="block min-w-0">
          <span className="label">Start</span>
          <input name="start" type="month" value={start} onChange={(e) => setStart(e.target.value)} required className="input tabular-nums" />
        </label>
        <label className="block min-w-0">
          <span className="label">End</span>
          {isCurrent ? (
            <span className="input block border-border bg-chip text-ink2">Present</span>
          ) : (
            <input name="end" type="month" value={end} onChange={(e) => setEnd(e.target.value)} required className="input tabular-nums" />
          )}
        </label>
      </div>
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
