import Link from "next/link";
import type { ReactNode } from "react";

import { Logo } from "@/components/shared/Brand";
import { Frame } from "@/components/shared/Frame";
import { brand } from "@/lib/content";
import { business, legalLinks } from "@/lib/members-content";

export default function LegalLayout({ children }: { children: ReactNode }) {
  return (
    <div data-stock="paper" className="flex min-h-svh flex-col">
      <Frame className="flex min-h-16 items-center border-b border-rule">
        <Link href="/" className="brand">
          <Logo size={32} eager />
          <span className="brand-name text-[19px]">{brand.name}</span>
        </Link>
      </Frame>
      <main id="top" className="frame w-full flex-1 py-10 lg:py-16">
        <article className="max-w-[68ch]">{children}</article>
      </main>
      <footer className="border-t border-rule py-6">
        <Frame className="t-note flex flex-wrap justify-between gap-4 text-fg-soft">
          <span>
            {business.legalName} · Last updated {business.updated}
          </span>
          <nav aria-label="Legal" className="flex gap-4">
            {legalLinks.map((link) => (
              <Link key={link.href} href={link.href} className="hover:text-fg">
                {link.label}
              </Link>
            ))}
          </nav>
        </Frame>
      </footer>
    </div>
  );
}
