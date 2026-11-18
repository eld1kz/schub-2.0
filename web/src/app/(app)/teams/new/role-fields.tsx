"use client";

import { useRef, useState, type KeyboardEvent } from "react";

const maxRoles = 10;

// Open roles, one input each. "+ Add role" adds a row; × removes one (the last row stays).
// Each row is sent as its own "roles" value. Enter adds the next row instead of submitting.
export function RoleFields() {
  const nextId = useRef(1);
  const list = useRef<HTMLDivElement>(null);
  const [rows, setRows] = useState([0]);

  function add() {
    if (rows.length >= maxRoles) return;
    setRows([...rows, nextId.current++]);
    // Focus the new row once it's rendered
    setTimeout(() => {
      const inputs = list.current?.querySelectorAll("input");
      inputs?.[inputs.length - 1]?.focus();
    });
  }

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>, last: boolean) {
    if (e.key !== "Enter") return;
    e.preventDefault();
    if (last && e.currentTarget.value.trim()) add();
  }

  return (
    <fieldset>
      <legend className="mb-1.5 block text-sm font-medium">
        Open roles<span aria-hidden className="ml-0.5 text-accent">*</span>
      </legend>
      <div ref={list} className="flex flex-col gap-2.5">
        {rows.map((id, i) => (
          <div key={id} className="flex items-center gap-2">
            <input
              name="roles"
              aria-label={`Role ${i + 1}`}
              required={i === 0}
              maxLength={40}
              placeholder={i === 0 ? "Designer" : "Backend developer"}
              onKeyDown={(e) => onKeyDown(e, i === rows.length - 1)}
              className="input h-11 sm:h-10"
            />
            <button
              type="button"
              onClick={() => setRows(rows.filter((r) => r !== id))}
              disabled={rows.length === 1}
              aria-label={`Remove role ${i + 1}`}
              className="grid h-11 w-11 shrink-0 place-items-center rounded-md text-ink2 hover:bg-chip hover:text-foreground disabled:invisible sm:h-10 sm:w-10"
            >
              <svg viewBox="0 0 24 24" aria-hidden className="h-4 w-4 fill-none stroke-current" strokeWidth={2} strokeLinecap="round">
                <path d="M6 6l12 12M18 6 6 18" />
              </svg>
            </button>
          </div>
        ))}
      </div>
      {rows.length < maxRoles ? (
        <button type="button" onClick={add} className="mt-3 text-sm font-semibold text-accent hover:underline">+ Add role</button>
      ) : (
        <p className="mt-3 text-[13px] text-muted">Up to {maxRoles} roles</p>
      )}
    </fieldset>
  );
}
