"use client";

import { useActionState, useId } from "react";
import { verifyAdminCode, type SaveResult } from "@/app/actions";
import { CodeField } from "../../code-field";
import { ErrorText, SubmitButton } from "@/components/ui";

export function VerifyForm({ next }: { next: string }) {
  const [state, action] = useActionState<SaveResult, FormData>(verifyAdminCode.bind(null, next), {});
  const id = useId();
  return (
    <form action={action} className="flex flex-col gap-3">
      <CodeField id={id} />
      {state.error && <ErrorText size="sm">{state.error}</ErrorText>}
      <SubmitButton className="w-fit">Continue</SubmitButton>
    </form>
  );
}
