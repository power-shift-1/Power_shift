import { Eyebrow } from "@/components/shared/Eyebrow";

export function AuthHeading({ eyebrow, title, lead }: { eyebrow: string; title: string; lead: string }) {
  return (
    <div>
      <Eyebrow dash>{eyebrow}</Eyebrow>
      <h1 className="mt-4 font-display text-[length:clamp(2.25rem,1.8rem+1.6vw,3.25rem)] leading-[1.05] tracking-[-0.012em]">{title}</h1>
      <p className="t-body mt-4 text-fg-soft">{lead}</p>
    </div>
  );
}
