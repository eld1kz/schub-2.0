"use client";

import { useActionState } from "react";
import { connect } from "@/app/actions";
import { SignInButton } from "./sign-in";

// `className` styles the button: outlined by default, `btn` for the main action on a profile.
// When the request isn't sent (the daily cap), the reason shows under the button.
export function ConnectButton({ profileId, status, isGuest, className = "btn-outline" }: { profileId: string; status?: string; isGuest: boolean; className?: string }) {
  const [result, action, pending] = useActionState(connect.bind(null, profileId), {});
  if (isGuest) return <SignInButton label="Sign in to connect" className={className} />;
  if (status) return <span className="text-xs text-muted capitalize">{status}</span>;
  return (
    <form action={action} className="flex flex-col items-start gap-1.5">
      <button disabled={pending} className={`${className} disabled:opacity-60`}>Connect</button>
      {result.error && <p role="alert" className="max-w-note text-meta text-danger ">{result.error}</p>}
    </form>
  );
}
