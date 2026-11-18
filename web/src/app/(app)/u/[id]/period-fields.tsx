"use client";

import { useState } from "react";

// Start and end months. "I currently work here" hides the end, and the entry is saved without one.
export function PeriodFields({ start, end, current, inputClass }: { start?: string; end?: string; current: boolean; inputClass: string }) {
  const [isCurrent, setCurrent] = useState(current);
  return (
    <>
      <div className="flex gap-3">
        <label className="block min-w-0 flex-1">
          <span className="label">Started</span>
          <input name="start" type="month" defaultValue={start} required className={inputClass} />
        </label>
        {!isCurrent && (
          <label className="block min-w-0 flex-1">
            <span className="label">Ended</span>
            <input name="end" type="month" defaultValue={end} required className={inputClass} />
          </label>
        )}
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="current" checked={isCurrent} onChange={(e) => setCurrent(e.target.checked)} className="accent-indigo-600" />
        I currently work here
      </label>
    </>
  );
}
