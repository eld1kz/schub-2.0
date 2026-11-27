"use client";

import { useFormStatus } from "react-dom";
import { Button, type ButtonProps } from "./button";

// A form's submit button for a server action: loading while the form is being sent (DESIGN.md)
export function SubmitButton(props: Omit<ButtonProps, "type">) {
  const { pending } = useFormStatus();
  return <Button {...props} pending={pending || Boolean(props.pending)} />;
}
