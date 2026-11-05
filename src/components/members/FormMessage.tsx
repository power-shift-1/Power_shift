import { cn } from "cn";
import { CircleAlert, CircleCheck } from "lucide-react";

/** An error (announced at once) or a confirmation (announced politely) under a form. */
export function FormMessage({ tone, children, className }: { tone: "error" | "ok"; children: string; className?: string }) {
  const Icon = tone === "error" ? CircleAlert : CircleCheck;
  return (
    <div role={tone === "error" ? "alert" : "status"} className={cn("t-note flex gap-2 text-fg", className)}>
      <Icon aria-hidden="true" className="mt-px size-4 shrink-0" />
      <p>{children}</p>
    </div>
  );
}
