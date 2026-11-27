"use client";

import { useState, useTransition } from "react";
import { unstable_rethrow } from "next/navigation";
import { Button, type ButtonProps } from "./button";
import { ErrorText } from "./field";

export type ActionResult = { error?: string };

// How long the check stays before the new state takes its place
const HOLD = 600;

// An optimistic action: `done` names the button that was pressed, from the click until the page shows the new state.
// The new page waits inside the same transition, so the check is seen first. If the server says no, `done` clears
// (the button is back) and `error` says why.
export function useOptimisticAction() {
  const [done, setDone] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [, start] = useTransition();

  function run(action: () => Promise<ActionResult>, key = "done") {
    setDone(key);
    setError("");
    start(async () => {
      let message = "";
      try {
        const [result] = await Promise.all([action(), new Promise((resolve) => setTimeout(resolve, HOLD))]);
        message = result.error ?? "";
      } catch (e) {
        unstable_rethrow(e);
        message = "Couldn't save it. Try again.";
      }
      start(() => {
        setDone(null);
        setError(message);
      });
    });
  }

  return { done, error, run };
}

// One button for such an action (Invite), with the error under it (DESIGN.md)
export function ActionButton({ action, ...props }: Omit<ButtonProps, "type" | "onClick" | "done" | "action"> & { action: () => Promise<ActionResult> }) {
  const { done, error, run } = useOptimisticAction();
  return (
    <span className="flex flex-col items-end gap-1">
      <Button {...props} type="button" done={done !== null} onClick={() => run(action)} />
      {error && <ErrorText as="span" className="max-w-note text-right">{error}</ErrorText>}
    </span>
  );
}
