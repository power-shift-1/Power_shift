import { cn } from "cn";
import { CircleAlert } from "lucide-react";
import type { ComponentProps, ReactNode } from "react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

// The same underlined field as the landing page's sign-up card.
const FIELD =
  "mt-1 h-12 rounded-none border-0 border-b-[1.5px] border-b-t-soft bg-transparent px-0 font-ui text-[17px] font-medium focus-visible:ring-0 aria-invalid:border-b-[2.5px] aria-invalid:border-b-t-ink aria-invalid:ring-0 md:text-[17px]";
const LABEL = "font-ui text-[15px] leading-[1.4] font-medium";

type FieldProps = ComponentProps<"input"> & { id: string; label: string; error?: string; hint?: ReactNode };

export function Field({ id, label, error, hint, className, ...inputProps }: FieldProps) {
  const describedBy = [error && `${id}-error`, hint && `${id}-hint`].filter(Boolean).join(" ") || undefined;
  return (
    <div className={className}>
      <Label htmlFor={id} className={LABEL}>
        {label}
      </Label>
      <Input id={id} aria-invalid={error ? true : undefined} aria-describedby={describedBy} className={FIELD} {...inputProps} />
      {hint ? (
        <p id={`${id}-hint`} className="t-note mt-2 text-fg-soft">
          {hint}
        </p>
      ) : null}
      {error ? <FieldError id={`${id}-error`}>{error}</FieldError> : null}
    </div>
  );
}

type TextAreaFieldProps = ComponentProps<"textarea"> & { id: string; label: string };

export function TextAreaField({ id, label, className, ...props }: TextAreaFieldProps) {
  return (
    <div className={className}>
      <Label htmlFor={id} className={LABEL}>
        {label}
      </Label>
      <textarea
        id={id}
        className="mt-2 min-h-28 w-full rounded-none border-[1.5px] border-t-soft bg-transparent p-3 font-ui text-[16px] font-medium outline-none focus-visible:border-t-ink"
        {...props}
      />
    </div>
  );
}

type SelectFieldProps = ComponentProps<"select"> & { id: string; label: string };

export function SelectField({ id, label, className, children, ...props }: SelectFieldProps) {
  return (
    <div className={className}>
      <Label htmlFor={id} className={LABEL}>
        {label}
      </Label>
      <select
        id={id}
        className="mt-1 h-12 w-full rounded-none border-0 border-b-[1.5px] border-b-t-soft bg-transparent font-ui text-[17px] font-medium outline-none focus-visible:border-b-t-ink"
        {...props}
      >
        {children}
      </select>
    </div>
  );
}

export function CheckboxField({ id, label, className, ...props }: ComponentProps<"input"> & { id: string; label: string }) {
  return (
    <label htmlFor={id} className={cn("flex items-center gap-3 font-ui text-[15px] font-medium", className)}>
      <input id={id} type="checkbox" className="size-5 accent-[var(--red)]" {...props} />
      {label}
    </label>
  );
}

export function FieldError({ id, children }: { id?: string; children: ReactNode }) {
  return (
    <p id={id} className="t-note mt-2 flex gap-2 text-fg">
      <CircleAlert aria-hidden="true" className="mt-px size-4 shrink-0" />
      <span>{children}</span>
    </p>
  );
}
