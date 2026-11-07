import Link from "next/link";
import { Suspense } from "react";

import { signOut } from "@/app/(auth)/actions";
import { Logo } from "@/components/shared/Brand";
import { Frame } from "@/components/shared/Frame";
import { getCurrentMember } from "@/lib/auth";
import { brand } from "@/lib/content";
import { account, memberNav } from "@/lib/members-content";
import { loadBell } from "@/lib/notifications";
import { createUserClient } from "@/lib/supabase/server";

import { Avatar } from "./Avatar";
import { MemberNav, NavLinks } from "./MemberNav";
import { MobileTabBar, TabLinks } from "./MobileTabBar";
import { NotificationBell } from "./NotificationBell";

// On phones the section links move to the bottom tab bar.
const DESKTOP_NAV = "hidden md:flex";

export function MemberHeader() {
  return (
    <>
      <header data-stock="paper" className="sticky top-0 z-40 border-b border-rule">
        <Frame className="flex min-h-16 items-center gap-x-6 py-2">
          <Link href="/" className="brand">
            <Logo size={32} eager />
            <span className="brand-name text-[19px]">{brand.name}</span>
          </Link>
          <Suspense fallback={<NavLinks items={memberNav} className={DESKTOP_NAV} />}>
            <SignedInPart />
          </Suspense>
        </Frame>
      </header>
      <Suspense fallback={<TabLinks isAdmin={false} />}>
        <SignedInTabs />
      </Suspense>
    </>
  );
}

async function SignedInPart() {
  const member = await getCurrentMember();
  const items = member?.isAdmin ? [...memberNav, { href: "/admin", label: "Admin" }] : memberNav;
  const supabase = member ? await createUserClient() : null;
  const bell = supabase ? await loadBell(supabase) : null;
  return (
    <>
      <MemberNav items={items} className={DESKTOP_NAV} />
      {member ? (
        <div className="ml-auto flex items-center gap-2 md:gap-3">
          {/* Keyed by member: Next can keep this header alive across a sign-out and a different sign-in. */}
          {bell ? <NotificationBell key={member.id} memberId={member.id} initial={bell} /> : null}
          <Link href="/account" aria-label={account.title} className="rounded-full focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus)]">
            <Avatar name={member.name} src={member.avatarUrl} size={32} />
          </Link>
          <form action={signOut} className="hidden md:block">
            <button type="submit" className="masthead-link font-ui text-[15px]">
              {account.signOut}
            </button>
          </form>
        </div>
      ) : null}
    </>
  );
}

async function SignedInTabs() {
  const member = await getCurrentMember();
  return member ? <MobileTabBar isAdmin={member.isAdmin} /> : null;
}
