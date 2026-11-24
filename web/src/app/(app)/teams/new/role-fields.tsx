"use client";

import { useEffect, useRef, useState } from "react";
import { ROLE_NOTE_MAX, ROLES } from "@/lib/roles";
import { FieldLabel, Input, ToggleChip } from "@/components/ui";

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
      <FieldLabel as="legend" required>Open roles</FieldLabel>
      <input ref={check} aria-hidden tabIndex={-1} value={picked.length > 0 ? "picked" : ""} onChange={() => {}} className="sr-only" />
      <div className="flex flex-wrap gap-1.5">
        {ROLES.map((role) => {
          const on = picked.includes(role);
          return (
            <ToggleChip key={role} on={on} onClick={() => toggle(role)} disabled={!on && picked.length >= maxRoles}>
              {role}
            </ToggleChip>
          );
        })}
      </div>
      {picked.length === 0 ? (
        <p className="mt-2 text-meta text-muted">Pick the roles you still need, up to {maxRoles}.</p>
      ) : (
        <div className="mt-4 flex flex-col border-t border-border">
          {picked.map((role) => (
            <div key={role} className="flex flex-col gap-1.5 border-b border-border py-3 sm:grid sm:grid-cols-label-sm sm:items-center sm:gap-4">
              <input type="hidden" name="roles" value={role} />
              <span className="text-base font-semibold">{role}</span>
              <Input
                name="role_notes"
                aria-label={`Note for ${role}`}
                maxLength={ROLE_NOTE_MAX}
                placeholder="Optional note, like Figma and mobile first"
              />
            </div>
          ))}
        </div>
      )}
    </fieldset>
  );
}
