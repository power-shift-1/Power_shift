"use client";

import { cn } from "cn";
import type { ComponentProps } from "react";
import { useFormStatus } from "react-dom";

import { Arrow } from "@/components/shared/Arrow";
import { Button } from "@/components/ui/button";

type SubmitButtonProps = Omit<ComponentProps<typeof Button>, "type"> & {
  label: string;
  pendingLabel?: string;
  arrow?: boolean;
  /** For forms that submit by hand, where the form's own status never turns pending. */
  pending?: boolean;
};

/** Sits inside its form, which is how it knows the form is submitting, unless told with `pending`. */
export function SubmitButton({ label, pendingLabel, arrow = false, variant = "reserve", size = "default", pending: pendingProp, className, ...props }: SubmitButtonProps) {
  const status = useFormStatus();
  const pending = pendingProp ?? status.pending;
  return (
    <Button
      type="submit"
      variant={variant}
      size={size}
      aria-busy={pending || undefined}
      aria-disabled={pending || undefined}
      onClick={(event) => {
        if (pending) event.preventDefault();
      }}
      // The button variants leave the font to the page, whose body text is the serif.
      className={cn("min-h-11 font-ui", className)}
      {...props}
    >
      <span>{pending && pendingLabel ? pendingLabel : label}</span>
      {arrow ? <Arrow /> : null}
    </Button>
  );
}
