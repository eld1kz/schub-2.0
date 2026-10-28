import { connect } from "@/app/actions";

export function ConnectButton({ profileId, status }: { profileId: string; status?: string }) {
  if (status) return <span className="text-xs text-muted capitalize">{status}</span>;
  return (
    <form action={connect.bind(null, profileId)}>
      <button className="btn-outline">Connect</button>
    </form>
  );
}
