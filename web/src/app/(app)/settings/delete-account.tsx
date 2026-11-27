"use client";

import { useActionState, useId, useRef, useState } from "react";
import { deleteAccount, type DeleteAccountState } from "@/app/actions";
import { Button, ErrorText, FieldLabel, Input, Modal } from "@/components/ui";

// "Delete account" and its confirmation: what goes, typed DELETE, then the red button.
// `blocked`: why it can't be done right now (the only admin), shown instead of the button.
export function DeleteAccount({ blocked }: { blocked: string }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState("");
  const [state, action, deleting] = useActionState<DeleteAccountState, FormData>(deleteAccount, {});
  const inputId = useId();

  if (blocked) return <p className="text-base text-ink2">{blocked}</p>;

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="w-fit text-base font-medium text-danger/75 hover:text-danger hover:underline">
        Delete account
      </button>
      <Modal
        open={open}
        dialogRef={dialog}
        label="Delete your account"
        width="measure"
        onClose={() => {
          setOpen(false);
          setTyped("");
        }}
      >
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
            <FieldLabel htmlFor={inputId}>Type DELETE to confirm</FieldLabel>
            <Input
              id={inputId}
              name="confirm"
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              autoComplete="off"
              autoCapitalize="characters"
              spellCheck={false}
              className="font-mono"
            />
          </div>
          {state.error && <ErrorText size="sm">{state.error}</ErrorText>}
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button type="button" variant="secondary" size="touch" shortcut="Esc" onClick={() => dialog.current?.close()}>Cancel</Button>
            <Button variant="danger" size="touch" disabled={typed !== "DELETE"} pending={deleting}>
              {deleting ? "Deleting..." : "Delete my account"}
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
