import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

import { Eyebrow } from "@/components/shared/Eyebrow";

export function PageIntro({ eyebrow, title, lead, children }: { eyebrow: string; title: string; lead?: string; children?: ReactNode }) {
  return (
    <header className="flex flex-col gap-4 border-b border-rule pb-8 lg:flex-row lg:items-end lg:justify-between">
      <div className="max-w-3xl">
        <Eyebrow dash>{eyebrow}</Eyebrow>
        <h1 className="mt-4 font-display text-[length:clamp(2.25rem,1.6rem+2.4vw,3.75rem)] leading-[1.05] tracking-[-0.012em] text-balance">
          {title}
        </h1>
        {lead ? <p className="t-body mt-4 text-fg-soft">{lead}</p> : null}
      </div>
      {children}
    </header>
  );
}

/** A titled block within a member page. */
export function Panel({ title, action, children }: { title: string; action?: ReactNode; children: ReactNode }) {
  return (
    <section className="border-t-[1.5px] border-t-gold-line pt-5">
      <div className="flex items-baseline justify-between gap-4">
        <h2 className="font-display text-[1.75rem] leading-[1.15]">{title}</h2>
        {action}
      </div>
      <div className="mt-5">{children}</div>
    </section>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return <p className="t-note text-fg-soft">{children}</p>;
}

/** A page-sized empty state: an icon in a gold ring, a line of text, and an optional next step. */
export function EmptyState({ icon: Icon, children, action }: { icon: LucideIcon; children: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-4 border border-dashed border-rule px-6 py-14 text-center">
      <span className="grid size-14 place-items-center rounded-full border-[1.5px] border-gold-line text-label">
        <Icon aria-hidden="true" className="size-6" />
      </span>
      <p className="t-body max-w-md text-fg-soft">{children}</p>
      {action}
    </div>
  );
}
