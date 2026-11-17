import { connect } from "@/app/actions";
import { SignInButton } from "./sign-in";

export function ConnectButton({ profileId, status, isGuest }: { profileId: string; status?: string; isGuest: boolean }) {
  if (isGuest) return <SignInButton label="Sign in to connect" className="btn-outline" />;
  if (status) return <span className="text-xs text-muted capitalize">{status}</span>;
  return (
    <form action={connect.bind(null, profileId)}>
      <button className="btn-outline">Connect</button>
    </form>
  );
}
