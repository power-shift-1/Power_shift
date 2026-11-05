"use client";

import { cn } from "cn";
import Link from "next/link";
import { usePathname } from "next/navigation";

type Items = readonly { href: string; label: string }[];

/** The nav with the current page marked. It reads the URL, so it must render inside a Suspense boundary. */
export function MemberNav({ items, className }: { items: Items; className?: string }) {
  return <NavLinks items={items} pathname={usePathname()} className={className} />;
}

/** The same links without a current page, for loading fallbacks, which can't read the URL. */
export function NavLinks({ items, pathname, className }: { items: Items; pathname?: string; className?: string }) {
  return (
    <nav aria-label="Members" className={cn("-mx-1 flex gap-1 overflow-x-auto", className)}>
      {items.map((item) => {
        const current = pathname !== undefined && (pathname === item.href || pathname.startsWith(`${item.href}/`));
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={current ? "page" : undefined}
            className={cn(
              "border-b-2 px-2 py-2 font-ui text-[15px] font-semibold whitespace-nowrap transition-colors",
              current ? "border-b-red text-fg" : "border-b-transparent text-fg-soft hover:text-fg",
            )}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
