import { cn } from "cn";
import { CircleAlert, CircleCheck } from "lucide-react";

type FormMessageProps = {
  tone: "error" | "ok";
  children: string;
  /**
   * False when the message sits inside a live region that is always on the page. A region created
   * together with its text is often not announced, so forms that show results keep one mounted.
   */
  live?: boolean;
  className?: string;
};

/** An error (announced at once) or a confirmation (announced politely) under a form. */
export function FormMessage({ tone, children, live = true, className }: FormMessageProps) {
  const Icon = tone === "error" ? CircleAlert : CircleCheck;
  return (
    <div role={live ? (tone === "error" ? "alert" : "status") : undefined} className={cn("t-note flex gap-2 text-fg", className)}>
      <Icon aria-hidden="true" className="mt-px size-4 shrink-0" />
      <p>{children}</p>
    </div>
  );
}
