import { cn } from "cn";

import { initials } from "@/lib/format";
import { publicSupabaseEnv } from "@/lib/supabase/env";

/**
 * Only pictures from this project's storage or Google sign-in are drawn. The database enforces the
 * same rule; this is the second line, so a stray URL can never make every viewer's browser call it.
 */
function trustedSrc(src: string | null | undefined) {
  if (!src) return null;
  try {
    const url = new URL(src);
    if (url.protocol !== "https:") return null;
    const project = publicSupabaseEnv()?.url;
    if (project && url.origin === new URL(project).origin && url.pathname.startsWith("/storage/v1/object/public/avatars/")) return src;
    if (/^lh[0-9]\.googleusercontent\.com$/.test(url.hostname)) return src;
  } catch {
    return null;
  }
  return null;
}

/** A member's picture, or their initials. Pictures load without Next's optimiser. */
export function Avatar({ name, src, size = 36, className }: { name: string; src?: string | null; size?: number; className?: string }) {
  const picture = trustedSrc(src);
  return (
    <span
      aria-hidden="true"
      className={cn(
        "inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-royal-deep font-ui font-semibold text-t-cream",
        className,
      )}
      style={{ width: size, height: size, fontSize: size * 0.38 }}
    >
      {picture ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={picture} alt="" width={size} height={size} referrerPolicy="no-referrer" className="size-full object-cover" />
      ) : (
        initials(name)
      )}
    </span>
  );
}
