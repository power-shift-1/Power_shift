import type { ReactNode } from "react";

import { Eyebrow } from "@/components/shared/Eyebrow";

export function LegalTitle({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <>
      <Eyebrow dash>{eyebrow}</Eyebrow>
      <h1 className="mt-4 mb-8 font-display text-[length:clamp(2.25rem,1.6rem+2.4vw,3.5rem)] leading-[1.05]">{title}</h1>
    </>
  );
}

export function LegalSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mt-8 font-ui text-[16px] leading-[1.65] [&_li]:mt-1 [&_p+p]:mt-3 [&_ul]:mt-2 [&_ul]:list-disc [&_ul]:pl-5">
      <h2 className="mb-2 font-ui text-[18px] font-semibold">{title}</h2>
      {children}
    </section>
  );
}
