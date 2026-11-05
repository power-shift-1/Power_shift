import { cn } from "cn";

import { initials } from "@/lib/format";

/** A member's picture, or their initials. Pictures come from Google, so they load without Next's optimiser. */
export function Avatar({ name, src, size = 36, className }: { name: string; src?: string | null; size?: number; className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-royal-deep font-ui font-semibold text-t-cream",
        className,
      )}
      style={{ width: size, height: size, fontSize: size * 0.38 }}
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt="" width={size} height={size} referrerPolicy="no-referrer" className="size-full object-cover" />
      ) : (
        initials(name)
      )}
    </span>
  );
}
