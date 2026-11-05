"use client";

import { cn } from "cn";
import { BookOpen, CircleUserRound, LayoutDashboard, MessagesSquare, Shield } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { memberNav } from "@/lib/members-content";

const ICONS: Record<string, typeof BookOpen> = {
  "/dashboard": LayoutDashboard,
  "/courses": BookOpen,
  "/chat": MessagesSquare,
  "/account": CircleUserRound,
  "/admin": Shield,
};

/** The phone's bottom tab bar, marking the current section. It reads the URL, so it renders inside Suspense. */
export function MobileTabBar({ isAdmin }: { isAdmin: boolean }) {
  return <TabLinks isAdmin={isAdmin} pathname={usePathname()} />;
}

/** The same bar without a current tab, for the loading fallback. */
export function TabLinks({ isAdmin, pathname }: { isAdmin: boolean; pathname?: string }) {
  const items = isAdmin ? [...memberNav, { href: "/admin", label: "Admin" }] : memberNav;
  return (
    <nav
      aria-label="Members"
      data-stock="paper"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-rule pb-[env(safe-area-inset-bottom)] md:hidden"
    >
      <ul className="flex">
        {items.map((item) => {
          const Icon = ICONS[item.href] ?? LayoutDashboard;
          const current = pathname !== undefined && (pathname === item.href || pathname.startsWith(`${item.href}/`));
          return (
            <li key={item.href} className="flex-1">
              <Link
                href={item.href}
                aria-current={current ? "page" : undefined}
                className={cn(
                  "flex min-h-16 flex-col items-center justify-center gap-1 font-ui text-[12px] font-semibold transition-colors",
                  current ? "text-red" : "text-fg-soft active:text-fg",
                )}
              >
                <Icon aria-hidden="true" className="size-6" strokeWidth={current ? 2.2 : 1.8} />
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
