import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";

import { MemberHeader } from "@/components/members/MemberHeader";
import { Frame } from "@/components/shared/Frame";
import { brand } from "@/lib/content";
import { legalLinks } from "@/lib/members-content";

export const metadata: Metadata = { robots: { index: false, follow: false } };

export default function MembersLayout({ children }: { children: ReactNode }) {
  return (
    <div data-stock="paper" data-members-area="" className="flex min-h-svh flex-col">
      <MemberHeader />
      <main id="top" className="frame w-full flex-1 py-10 lg:py-14">
        {children}
      </main>
      {/* The bottom padding on phones keeps the footer clear of the tab bar. */}
      <footer className="border-t border-rule pt-6 pb-[calc(5.5rem+env(safe-area-inset-bottom))] md:pb-6">
        <Frame className="t-note flex flex-wrap items-center justify-between gap-4 text-fg-soft">
          <span>{brand.footerLine}</span>
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
