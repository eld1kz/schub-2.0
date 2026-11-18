import { connect } from "@/app/actions";
import { SignInButton } from "./sign-in";

// `className` styles the button: outlined by default, `btn` for the main action on a profile
export function ConnectButton({ profileId, status, isGuest, className = "btn-outline" }: { profileId: string; status?: string; isGuest: boolean; className?: string }) {
  if (isGuest) return <SignInButton label="Sign in to connect" className={className} />;
  if (status) return <span className="text-xs text-muted capitalize">{status}</span>;
  return (
    <form action={connect.bind(null, profileId)}>
      <button className={className}>Connect</button>
    </form>
  );
}
