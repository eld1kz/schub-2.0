"use client";

import { connect } from "@/app/actions";
import { SignInButton } from "./sign-in";
import { Button, ErrorText, buttonClass, useOptimisticAction, type ButtonSize, type ButtonVariant } from "@/components/ui";

// Secondary by default, primary for the main action on a profile. A check shows at once, then the status; when the
// request isn't sent (the daily cap), the button comes back with the reason under it.
export function ConnectButton({ profileId, status, isGuest, variant = "secondary", size = "md" }: { profileId: string; status?: string; isGuest: boolean; variant?: ButtonVariant; size?: ButtonSize }) {
  const { done, error, run } = useOptimisticAction();
  if (isGuest) return <SignInButton label="Sign in to connect" className={buttonClass({ variant, size })} />;
  if (status && !done) return <span className="text-xs text-muted capitalize">{status}</span>;
  return (
    <span className="flex flex-col items-start gap-1.5">
      <Button type="button" variant={variant} size={size} done={done !== null} onClick={() => run(() => connect(profileId))}>Connect</Button>
      {error && <ErrorText className="max-w-note">{error}</ErrorText>}
    </span>
  );
}
