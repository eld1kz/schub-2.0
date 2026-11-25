import { Field, Input } from "@/components/ui";

// The 6-digit code from an authenticator app: in two-factor setup (/settings) and the admin code screen
export function CodeField({ id, label = "6-digit code" }: { id: string; label?: string }) {
  return (
    <Field id={id} label={label}>
      <Input
        id={id}
        name="code"
        required
        inputMode="numeric"
        autoComplete="one-time-code"
        pattern="[0-9 ]{6,7}"
        maxLength={7}
        placeholder="123 456"
        className="max-w-note font-mono"
      />
    </Field>
  );
}
