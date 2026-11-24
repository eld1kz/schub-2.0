"use client";

import { useActionState, useEffect, useId, useRef, useState } from "react";
import { deleteAccount, type DeleteAccountState } from "@/app/actions";

// "Delete account" and its confirmation: what goes, typed DELETE, then the red button.
// `blocked`: why it can't be done right now (the only admin), shown instead of the button.
export function DeleteAccount({ blocked }: { blocked: string }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState("");
  const [state, action, deleting] = useActionState<DeleteAccountState, FormData>(deleteAccount, {});
  const inputId = useId();

  useEffect(() => {
    if (open) dialog.current?.showModal();
  }, [open]);

  if (blocked) return <p className="text-base text-ink2">{blocked}</p>;

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="w-fit text-base font-medium text-danger/75 hover:text-danger hover:underline ">
        Delete account
      </button>
      <dialog
        ref={dialog}
        aria-label="Delete your account"
        onClose={() => {
          setOpen(false);
          setTyped("");
        }}
        className="m-0 mt-auto max-h-[92dvh] w-full max-w-none overflow-y-auto rounded-t-lg bg-background p-0 text-foreground backdrop:bg-[rgba(20,20,24,0.45)] sm:mx-auto sm:mt-20 sm:mb-auto sm:max-w-measure sm:rounded-lg sm:border sm:border-line2 sm:shadow-modal "
      >
        {open && (
          <form action={action} className="flex flex-col gap-4 px-4 py-6 sm:px-6">
            <h2 className="text-xl font-semibold tracking-snug">Delete your account?</h2>
            <div className="flex flex-col gap-3 text-base leading-normal text-ink2">
              <p>
                Your profile, experience, projects, awards, connections, applications and notifications are deleted for good.
                Teams you own are handed to a teammate, or deleted if nobody else is on them.
              </p>
              <p className="font-medium text-foreground">This can&apos;t be undone.</p>
            </div>
            <div>
              <label htmlFor={inputId} className="mb-1.5 block text-sm font-medium">Type DELETE to confirm</label>
              <input
                id={inputId}
                name="confirm"
                value={typed}
                onChange={(e) => setTyped(e.target.value)}
                autoComplete="off"
                autoCapitalize="characters"
                spellCheck={false}
                className="input h-11 font-mono sm:h-10"
              />
            </div>
            {state.error && <p role="alert" className="text-sm text-danger ">{state.error}</p>}
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button type="button" onClick={() => dialog.current?.close()} className="btn-outline h-11 sm:h-[38px]">Cancel</button>
              <button
                disabled={typed !== "DELETE" || deleting}
                className="inline-flex h-11 items-center justify-center rounded-md bg-danger px-4 text-sm font-semibold whitespace-nowrap text-background hover:bg-danger disabled:opacity-40 sm:h-[38px] dark:hover:bg-danger"
              >
                {deleting ? "Deleting..." : "Delete my account"}
              </button>
            </div>
          </form>
        )}
      </dialog>
    </>
  );
}
