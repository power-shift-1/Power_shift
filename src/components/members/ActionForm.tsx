"use client";

import { cn } from "cn";
import { startTransition, useActionState, useEffect, useRef, type FormEvent, type ReactNode } from "react";

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

/**
 * A form for a Server Action that answers with a short message, used across the account and admin pages.
 * It submits by hand rather than through the form's action, because React resets a form after every
 * action, which would wipe what someone typed whenever the action only reports a mistake. It clears
 * the fields itself after a success, so the next entry starts fresh.
 */
export function ActionForm({ action, submitLabel, pendingLabel, variant = "reserve", confirm, className, children }: ActionFormProps) {
  const [state, formAction, pending] = useActionState(action, {});
  const form = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.ok) form.current?.reset();
  }, [state]);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending || (confirm && !window.confirm(confirm))) return;
    const data = new FormData(event.currentTarget);
    startTransition(() => formAction(data));
  }

  return (
    <form ref={form} onSubmit={submit} className={cn("flex flex-col gap-5", className)}>
      {children}
      <div className="flex flex-col gap-3">
        <SubmitButton label={submitLabel} pendingLabel={pendingLabel} variant={variant} pending={pending} className="self-start" />
        {/* Always on the page, so the result is announced when it appears. */}
        <div aria-live="polite" className="empty:hidden">
          {state.message ? (
            <FormMessage tone={state.ok ? "ok" : "error"} live={false}>
              {state.message}
            </FormMessage>
          ) : null}
        </div>
      </div>
    </form>
  );
}
