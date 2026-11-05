"use client";

import type { ComponentProps } from "react";
import { useFormStatus } from "react-dom";

import { Arrow } from "@/components/shared/Arrow";
import { Button } from "@/components/ui/button";

type SubmitButtonProps = Omit<ComponentProps<typeof Button>, "type"> & {
  label: string;
  pendingLabel?: string;
  arrow?: boolean;
};

/** Must sit inside its form, which is how it knows the form is submitting. */
export function SubmitButton({ label, pendingLabel, arrow = false, variant = "reserve", size = "default", ...props }: SubmitButtonProps) {
  const { pending } = useFormStatus();
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
      {...props}
    >
      <span>{pending && pendingLabel ? pendingLabel : label}</span>
      {arrow ? <Arrow /> : null}
    </Button>
  );
}
