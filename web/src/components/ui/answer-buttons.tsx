"use client";

import { useOptimisticAction, type ActionResult } from "./action-button";
import { Button } from "./button";
import { ErrorText } from "./field";

// Accept and Decline for something waiting on you: a request, an application, an invitation (DESIGN.md).
// The pressed one shows a check at once; if it fails, both come back with the reason.
export function AnswerButtons({ accept, decline, acceptLabel, declineLabel }: {
  accept: () => Promise<ActionResult>;
  decline: () => Promise<ActionResult>;
  // Names the buttons for screen readers when "Accept" alone doesn't say what
  acceptLabel?: string;
  declineLabel?: string;
}) {
  const { done, error, run } = useOptimisticAction();
  return (
    <div className="flex shrink-0 flex-col items-start gap-1.5">
      <div className="flex gap-2">
        <Button type="button" size="sm" aria-label={acceptLabel} done={done === "accept"} disabled={done !== null} onClick={() => run(accept, "accept")}>Accept</Button>
        <Button type="button" variant="secondary" size="sm" aria-label={declineLabel} done={done === "decline"} disabled={done !== null} onClick={() => run(decline, "decline")}>Decline</Button>
      </div>
      {error && <ErrorText className="max-w-note">{error}</ErrorText>}
    </div>
  );
}
