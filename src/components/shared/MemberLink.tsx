"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";

import { mastheadMember } from "@/lib/members-content";

const SESSION_COOKIE = /(?:^|;\s*)sb-[^=]+-auth-token(?:\.0)?=/;
const noSubscription = () => () => {};

/**
 * "Sign in", or "My dashboard" once a Supabase session cookie exists. It only checks the cookie's name,
 * so the landing page stays static and doesn't load Supabase. The member pages check the session for real.
 */
export function MemberLink({ className }: { className?: string }) {
  const signedIn = useSyncExternalStore(
    noSubscription,
    () => SESSION_COOKIE.test(document.cookie),
    () => false,
  );
  return (
    <Link href={signedIn ? "/dashboard" : "/sign-in"} prefetch={false} className={className}>
      {signedIn ? mastheadMember.signedIn : mastheadMember.signedOut}
    </Link>
  );
}
