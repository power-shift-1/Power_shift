import Link from "next/link";

import { Brand } from "@/components/shared/Brand";
import { Frame } from "@/components/shared/Frame";
import { Stock } from "@/components/shared/Stock";
import { brand } from "@/lib/content";
import { legalLinks } from "@/lib/members-content";

export function Footer() {
  return (
    <Stock as="footer" stock="champagne" data-inline-cta="" className="footer">
      <Frame className="flex flex-col items-start gap-4 lg:flex-row lg:items-center lg:justify-between">
        <Brand variant="footer" />
        <div className="flex flex-col gap-2 lg:items-end">
          <p className="t-note lg:text-right">{brand.footerLine}</p>
          <nav aria-label="Legal" className="t-note flex gap-4">
            {legalLinks.map((link) => (
              <Link key={link.href} href={link.href} prefetch={false} className="underline-offset-4 hover:underline">
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
      </Frame>
    </Stock>
  );
}
