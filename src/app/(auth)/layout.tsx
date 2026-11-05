import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";

import { Logo } from "@/components/shared/Brand";
import { Frame } from "@/components/shared/Frame";
import { brand } from "@/lib/content";

export const metadata: Metadata = { robots: { index: false } };

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div data-stock="paper" className="min-h-svh">
      <Frame className="flex min-h-16 items-center border-b border-rule">
        <Link href="/" className="brand">
          <Logo size={32} eager />
          <span className="brand-name text-[19px]">{brand.name}</span>
        </Link>
      </Frame>
      <main id="top" className="frame py-10 lg:py-16">
        <div className="w-full max-w-[480px]">{children}</div>
      </main>
    </div>
  );
}
