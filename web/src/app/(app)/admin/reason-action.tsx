"use client";

import { useActionState, useId } from "react";
import { ADMIN_REASON_MAX } from "@/lib/reports";
import type { SaveResult } from "@/app/actions";
import { ErrorText, Input, SubmitButton } from "@/components/ui";

// One admin action behind a quiet link: it opens a reason field and a confirm button. Hiding, suspending and
// dismissing need the reason (the database checks it too); for the rest it's optional. Every one is logged.
export function ReasonAction({ label, action, required = true, danger = false }: {
  label: string;
  action: (prev: SaveResult, formData: FormData) => Promise<SaveResult>;
  required?: boolean;
  danger?: boolean;
}) {
  const [state, formAction] = useActionState<SaveResult, FormData>(action, {});
  const id = useId();
  return (
    <details className="group">
      <summary className={`w-fit cursor-pointer list-none text-sm font-medium [&::-webkit-details-marker]:hidden ${danger ? "text-danger/75 hover:text-danger" : "text-ink2 hover:text-foreground"}`}>
        {label}
      </summary>
      <form action={formAction} className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-start">
        <label htmlFor={id} className="sr-only">Reason</label>
        <Input id={id} name="reason" small required={required} maxLength={ADMIN_REASON_MAX} placeholder={required ? "Reason (required, logged)" : "Reason (optional, logged)"} className="sm:w-search" />
        <SubmitButton variant={danger ? "danger" : "secondary"} size="sm">{`Confirm: ${label}`}</SubmitButton>
      </form>
      {state.error && <ErrorText under>{state.error}</ErrorText>}
    </details>
  );
}
