import { requireUser } from "@/lib/supabase/server";
import { signOut } from "@/app/actions";
import { SignInPrompt } from "../sign-in";
import { KeyValue, Section } from "../u/[id]/profile-parts";
import { DeleteAccount } from "./delete-account";

export const instant = false;

const providers = [
  ["google", "Google"],
  ["github", "GitHub"],
] as const;

// Your account: how you sign in, signing out, and deleting it
export default async function SettingsPage() {
  const { supabase, isGuest } = await requireUser();
  if (isGuest) return <SignInPrompt text="Sign in to see your account settings." />;
  const [{ data: auth }, { data: blocked }] = await Promise.all([supabase.auth.getUser(), supabase.rpc("my_account_deletion_blocker")]);
  const linked = new Set((auth.user?.identities ?? []).map((i) => i.provider));

  return (
    <div className="max-w-[752px]">
      <h1 className="pb-8 text-[28px] font-semibold tracking-[-0.02em] sm:pb-10 sm:text-4xl sm:tracking-[-0.03em]">Settings</h1>

      <Section title="Account">
        <div className="flex flex-col gap-3">
          <KeyValue label="Email">{auth.user?.email || "None"}</KeyValue>
          {providers.map(([id, name]) => (
            <KeyValue key={id} label={name}>
              {linked.has(id) ? <span className="font-medium">Linked</span> : <span className="text-muted">Not linked</span>}
            </KeyValue>
          ))}
          <form action={signOut} className="pt-2">
            <button className="btn-outline">Sign out</button>
          </form>
        </div>
      </Section>

      <Section title="Danger zone">
        <div className="flex flex-col gap-2">
          <p className="text-[15px] text-ink2">Delete your account and everything on it. Teams you own go to a teammate.</p>
          <DeleteAccount blocked={(blocked as string | null) ?? ""} />
        </div>
      </Section>
    </div>
  );
}
