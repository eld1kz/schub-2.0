"use client";

import { useEffect, useRef, useState } from "react";
import { ROLE_NOTE_MAX, ROLES } from "@/lib/roles";

const maxRoles = 10;

// Open roles, picked from the fixed list (lib/roles.ts) as chips, in the order they were picked. Each picked role
// gets a row with an optional note. Every row sends a "roles" value and a "role_notes" value at the same position.
export function RoleFields() {
  const [picked, setPicked] = useState<string[]>([]);
  // The chips are buttons, so this hidden field is what the browser checks before posting
  const check = useRef<HTMLInputElement>(null);
  useEffect(() => check.current?.setCustomValidity(picked.length > 0 ? "" : "Pick at least one open role."), [picked]);
  const toggle = (role: string) => setPicked(picked.includes(role) ? picked.filter((r) => r !== role) : [...picked, role]);

  return (
    <fieldset>
      <legend className="mb-1.5 block text-sm font-medium">
        Open roles<span aria-hidden className="ml-0.5 text-accent">*</span>
      </legend>
      <input ref={check} aria-hidden tabIndex={-1} value={picked.length > 0 ? "picked" : ""} onChange={() => {}} className="sr-only" />
      <div className="flex flex-wrap gap-1.5">
        {ROLES.map((role) => {
          const on = picked.includes(role);
          return (
            <button
              key={role}
              type="button"
              aria-pressed={on}
              onClick={() => toggle(role)}
              disabled={!on && picked.length >= maxRoles}
              className={`h-9 rounded-md border px-3 text-sm transition-colors disabled:opacity-40 ${on ? "border-accent bg-accent-soft font-medium text-accent" : "border-line2 text-ink2 hover:border-muted hover:text-foreground"}`}
            >
              {role}
            </button>
          );
        })}
      </div>
      {picked.length === 0 ? (
        <p className="mt-2 text-meta text-muted">Pick the roles you still need, up to {maxRoles}.</p>
      ) : (
        <div className="mt-4 flex flex-col border-t border-border">
          {picked.map((role) => (
            <div key={role} className="flex flex-col gap-1.5 border-b border-border py-3 sm:grid sm:grid-cols-[120px_minmax(0,1fr)] sm:items-center sm:gap-4">
              <input type="hidden" name="roles" value={role} />
              <span className="text-base font-semibold">{role}</span>
              <input
                name="role_notes"
                aria-label={`Note for ${role}`}
                maxLength={ROLE_NOTE_MAX}
                placeholder="Optional note, like Figma and mobile first"
                className="input h-11 sm:h-10"
              />
            </div>
          ))}
        </div>
      )}
    </fieldset>
  );
}
