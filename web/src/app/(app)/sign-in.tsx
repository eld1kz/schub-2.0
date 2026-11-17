import { signIn } from "@/app/actions";

export function SignInButton({ label = "Sign in with Google", className = "btn" }: { label?: string; className?: string }) {
  return (
    <form action={signIn}>
      <button className={className}>{label}</button>
    </form>
  );
}

// Shown in place of a form guests can't use
export function SignInPrompt({ text }: { text: string }) {
  return (
    <div className="max-w-md space-y-3 rounded-md border border-border p-4">
      <p className="text-sm">{text}</p>
      <SignInButton />
    </div>
  );
}
