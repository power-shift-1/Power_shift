"use client";

import { Menu, X } from "lucide-react";
import { useEffect, useRef, type MouseEvent } from "react";
import { Brand } from "@/components/shared/Brand";
import { Frame } from "@/components/shared/Frame";
import { MemberLink } from "@/components/shared/MemberLink";
import { ReserveLink } from "@/components/shared/ReserveLink";
import { StockObserver } from "@/components/shared/StockObserver";
import { useInlineCtaVisible } from "@/hooks/use-inline-cta";
import { navCta, navLinks } from "@/lib/content";

export function Masthead() {
  const inlineVisible = useInlineCtaVisible();
  const menu = useRef<HTMLDetailsElement>(null);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const details = menu.current;
      if (event.key !== "Escape" || !details?.open) return;
      details.open = false;
      details.querySelector("summary")?.focus();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  const closeOnLinkTap = (event: MouseEvent<HTMLDivElement>) => {
    if (menu.current && (event.target as Element).closest("a")) menu.current.open = false;
  };

  return (
    <header data-masthead data-chrome data-stock="paper" className="masthead">
      <StockObserver />
      <Frame className="masthead-bar">
        <Brand variant="masthead" />

        <div className="mx-auto" />

        <nav className="hidden items-center gap-6 lg:flex">
          {navLinks.map((link) => (
            <a key={link.href} href={link.href} className="masthead-link">
              {link.label}
            </a>
          ))}
          <MemberLink className="masthead-link" />
          <ReserveLink label={navCta} size="md" tone={inlineVisible ? "quiet" : "solid"} />
        </nav>

        <details ref={menu} className="group lg:hidden">
          <summary aria-label="Menu" className="masthead-menu-toggle">
            <Menu aria-hidden="true" className="size-6 group-open:hidden" />
            <X aria-hidden="true" className="hidden size-6 group-open:block" />
          </summary>
          <div className="masthead-menu-panel" onClick={closeOnLinkTap}>
            <nav className="frame">
              {navLinks.map((link) => (
                <a key={link.href} href={link.href} className="masthead-menu-link">
                  {link.label}
                </a>
              ))}
              <MemberLink className="masthead-menu-link" />
              <ReserveLink label={navCta} size="lg" full className="mt-2" />
            </nav>
          </div>
        </details>
      </Frame>
      <span aria-hidden="true" className="progress-hairline" />
    </header>
  );
}
