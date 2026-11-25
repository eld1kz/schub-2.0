"use client";

import { useActionState, useId, useState, useTransition } from "react";
import { confirmTwoFactor, removeTwoFactor, startTwoFactor, type SaveResult, type TwoFactorSetup } from "@/app/actions";
import { qrPath } from "@/lib/story";
import { CodeField } from "../code-field";
import { Button, ErrorText, SubmitButton } from "@/components/ui";

// Two-factor authentication: off, setting it up (a QR code for an authenticator app, then its first code), or on
// (turning it off takes a current code). `on` comes from the server, so finishing either way re-renders this.
export function TwoFactor({ on }: { on: boolean }) {
  return on ? <TurnOff /> : <SetUp />;
}

function SetUp() {
  const [setup, setSetup] = useState<TwoFactorSetup | null>(null);
  const [starting, start] = useTransition();
  if (!setup?.factorId) {
    return (
      <div className="flex flex-col gap-2">
        <p className="text-base text-ink2">Off. It adds a second step: a 6-digit code from an authenticator app on your phone. Admins need it to use the admin area.</p>
        <Button type="button" variant="secondary" pending={starting} onClick={() => start(async () => setSetup(await startTwoFactor()))} className="w-fit">
          Set up two-factor
        </Button>
        {setup?.error && <ErrorText size="sm">{setup.error}</ErrorText>}
      </div>
    );
  }
  return <Confirm factorId={setup.factorId} uri={setup.uri ?? ""} secret={setup.secret ?? ""} />;
}

function Confirm({ factorId, uri, secret }: { factorId: string; uri: string; secret: string }) {
  const [state, action] = useActionState<SaveResult, FormData>(confirmTwoFactor.bind(null, factorId), {});
  const codeId = useId();
  const { size, d } = qrPath(uri);
  return (
    <form action={action} className="flex flex-col gap-4">
      <p className="text-base text-ink2">Scan this with an authenticator app (Google Authenticator, 1Password, Authy), then enter the code it shows.</p>
      <svg viewBox={`0 0 ${size} ${size}`} role="img" aria-label="QR code for your authenticator app" shapeRendering="crispEdges" className="h-28 w-28 rounded-sm bg-qr-paper">
        <path d={d} className="fill-qr-ink" />
      </svg>
      <p className="text-sm text-ink2">
        Can&apos;t scan it? Enter this key: <code data-testid="totp-secret" className="font-mono text-foreground break-all">{secret}</code>
      </p>
      <CodeField id={codeId} />
      {state.error && <ErrorText size="sm">{state.error}</ErrorText>}
      <SubmitButton className="w-fit">Turn on</SubmitButton>
    </form>
  );
}

function TurnOff() {
  const [state, action] = useActionState<SaveResult, FormData>(removeTwoFactor, {});
  const codeId = useId();
  return (
    <div className="flex flex-col gap-2">
      <p className="text-base"><span className="font-medium">On.</span> <span className="text-ink2">Your second step is a code from your authenticator app.</span></p>
      <details>
        <summary className="w-fit cursor-pointer list-none text-sm text-ink2 hover:text-foreground [&::-webkit-details-marker]:hidden">Turn off two-factor</summary>
        <form action={action} className="mt-3 flex flex-col gap-3">
          <CodeField id={codeId} label="Enter a current code to turn it off" />
          {state.error && <ErrorText size="sm">{state.error}</ErrorText>}
          <SubmitButton variant="secondary" className="w-fit">Turn off</SubmitButton>
        </form>
      </details>
    </div>
  );
}
