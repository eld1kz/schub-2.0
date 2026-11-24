"use client";

import { useActionState, useId, useState } from "react";
import type { EmailSignInState } from "./actions";

// Email field and "Send sign-in link"; once sent, "Check your inbox" until they pick a different email
// `lastUsed`: this browser signed in with email last time
export function EmailSignIn({ action, lastUsed }: { action: (prev: EmailSignInState, formData: FormData) => Promise<EmailSignInState>; lastUsed: boolean }) {
  const [state, send, pending] = useActionState(action, {});
  // The sent state they've moved on from with "Use a different email"
  const [dismissed, setDismissed] = useState<EmailSignInState | null>(null);
  // The landing page shows the form twice
  const id = useId();

  if (state.sent && state !== dismissed) {
    return (
      <div role="status" className="flex flex-col gap-1.5 border-y border-line2 py-4">
        <p className="text-base font-semibold">Check your inbox</p>
        <p className="text-sm leading-normal text-ink2">
          We sent a sign-in link to <span className="font-medium break-all text-foreground">{state.sent}</span>. Open it in this browser.
        </p>
        <button type="button" onClick={() => setDismissed(state)} className="mt-1 w-fit text-sm font-semibold text-accent hover:underline">
          Use a different email
        </button>
      </div>
    );
  }

  return (
    <form action={send} className="flex flex-col gap-2">
      <label htmlFor={id} className="sr-only">Email</label>
      {/* After an error the address stays in the field; after "Use a different email" it starts empty */}
      <input
        id={id}
        type="email"
        name="email"
        required
        maxLength={254}
        autoComplete="email"
        placeholder="you@university.edu"
        defaultValue={state.error ? state.email : ""}
        className="input h-11"
      />
      {state.error && <p role="alert" className="text-meta text-danger ">{state.error}</p>}
      <button className="btn h-11 w-full gap-2 px-4 text-base" disabled={pending}>
        <span className="flex-1">{pending ? "Sending..." : "Send sign-in link"}</span>
        {/* Muted for the accent button: its own text color, faded */}
        {lastUsed && <span className="font-mono text-xs font-normal text-on-accent/75">Last used</span>}
      </button>
    </form>
  );
}
