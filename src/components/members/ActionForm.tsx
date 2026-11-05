"use client";

import { cn } from "cn";
import { useActionState, type ReactNode } from "react";

import type { FormState } from "@/lib/form-state";

import { FormMessage } from "./FormMessage";
import { SubmitButton } from "./SubmitButton";

type ActionFormProps = {
  action: (previous: FormState, formData: FormData) => Promise<FormState>;
  submitLabel: string;
  pendingLabel?: string;
  /** For a destructive or quiet action, such as Delete. */
  variant?: "reserve" | "outline" | "ghost";
  confirm?: string;
  className?: string;
  children?: ReactNode;
};

/** A form for a Server Action that answers with a short message, used across the account and admin pages. */
export function ActionForm({ action, submitLabel, pendingLabel, variant = "reserve", confirm, className, children }: ActionFormProps) {
  const [state, formAction] = useActionState(action, {});
  return (
    <form
      action={formAction}
      className={cn("flex flex-col gap-5", className)}
      onSubmit={(event) => {
        if (confirm && !window.confirm(confirm)) event.preventDefault();
      }}
    >
      {children}
      <div className="flex flex-wrap items-center gap-4">
        <SubmitButton label={submitLabel} pendingLabel={pendingLabel} variant={variant} />
        {state.message ? <FormMessage tone={state.ok ? "ok" : "error"}>{state.message}</FormMessage> : null}
      </div>
    </form>
  );
}
