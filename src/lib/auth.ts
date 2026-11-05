import "server-only";

import { notFound, redirect } from "next/navigation";
import { cache } from "react";

import { createUserClient } from "@/lib/supabase/server";

export type Member = {
  id: string;
  email: string;
  name: string;
  avatarUrl: string | null;
  isAdmin: boolean;
  isBanned: boolean;
};

/** The signed-in member, read once per request, or null for a visitor. */
export const getCurrentMember = cache(async (): Promise<Member | null> => {
  const supabase = await createUserClient();
  if (!supabase) return null;

  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  if (!claims?.sub) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, avatar_url, role, banned_at")
    .eq("id", claims.sub)
    .maybeSingle();

  const email = typeof claims.email === "string" ? claims.email : "";
  return {
    id: claims.sub,
    email,
    name: profile?.full_name || email.split("@")[0] || "Member",
    avatarUrl: profile?.avatar_url ?? null,
    isAdmin: profile?.role === "admin",
    isBanned: Boolean(profile?.banned_at),
  };
});

/** The signed-in member, or a redirect to sign in that comes back to `next`. */
export async function requireMember(next = "/dashboard") {
  const member = await getCurrentMember();
  if (!member) redirect(`/sign-in?next=${encodeURIComponent(next)}`);
  return member;
}

/** Admin pages answer 404 to everyone else, so they don't reveal that they exist. */
export async function requireAdmin() {
  const member = await requireMember("/admin");
  if (!member.isAdmin) notFound();
  return member;
}

/** For Server Actions: the member and their client, or null when the session has ended. */
export async function memberClient() {
  const [member, supabase] = await Promise.all([getCurrentMember(), createUserClient()]);
  return member && supabase ? { member, supabase } : null;
}
