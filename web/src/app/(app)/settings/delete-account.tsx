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

  if (blocked) return <p className="text-[15px] text-ink2">{blocked}</p>;

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="w-fit text-[15px] font-medium text-red-600/75 hover:text-red-600 hover:underline dark:text-red-400/75 dark:hover:text-red-400">
        Delete account
      </button>
      <dialog
        ref={dialog}
        aria-label="Delete your account"
        onClose={() => {
          setOpen(false);
          setTyped("");
        }}
        className="m-0 mt-auto max-h-[92dvh] w-full max-w-none overflow-y-auto rounded-t-2xl bg-background p-0 text-foreground backdrop:bg-[rgba(20,20,24,0.45)] sm:mx-auto sm:mt-24 sm:mb-auto sm:max-w-[520px] sm:rounded-[10px] sm:border sm:border-line2 sm:shadow-[0_24px_60px_rgba(0,0,0,0.22)] dark:backdrop:bg-black/60"
      >
        {open && (
          <form action={action} className="flex flex-col gap-5 px-5 py-6 sm:px-7">
            <h2 className="text-xl font-semibold tracking-[-0.01em]">Delete your account?</h2>
            <div className="flex flex-col gap-3 text-[15px] leading-normal text-ink2">
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
            {state.error && <p role="alert" className="text-sm text-red-600 dark:text-red-400">{state.error}</p>}
            <div className="flex flex-col-reverse gap-2.5 sm:flex-row sm:justify-end">
              <button type="button" onClick={() => dialog.current?.close()} className="btn-outline h-11 sm:h-[38px]">Cancel</button>
              <button
                disabled={typed !== "DELETE" || deleting}
                className="inline-flex h-11 items-center justify-center rounded-md bg-red-600 px-5 text-sm font-semibold whitespace-nowrap text-white hover:bg-red-700 disabled:opacity-40 sm:h-[38px] dark:bg-red-500 dark:hover:bg-red-600"
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
