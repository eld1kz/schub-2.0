"use client";

import { useActionState } from "react";
import { connect } from "@/app/actions";
import { SignInButton } from "./sign-in";
import { ErrorText, buttonClass } from "@/components/ui";

// `className` styles the button: outlined by default, `btn` for the main action on a profile.
// When the request isn't sent (the daily cap), the reason shows under the button.
export function ConnectButton({ profileId, status, isGuest, className = buttonClass({ variant: "secondary" }) }: { profileId: string; status?: string; isGuest: boolean; className?: string }) {
  const [result, action, pending] = useActionState(connect.bind(null, profileId), {});
  if (isGuest) return <SignInButton label="Sign in to connect" className={className} />;
  if (status) return <span className="text-xs text-muted capitalize">{status}</span>;
  return (
    <form action={action} className="flex flex-col items-start gap-1.5">
      <button disabled={pending} className={`${className} disabled:opacity-60`}>Connect</button>
      {result.error && <ErrorText className="max-w-note">{result.error}</ErrorText>}
    </form>
  );
}
