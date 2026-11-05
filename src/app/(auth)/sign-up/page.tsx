import type { Metadata } from "next";

import { AuthHeading } from "@/components/members/auth/AuthHeading";
import { SignUpForm } from "@/components/members/auth/AuthForms";
import { FormMessage } from "@/components/members/FormMessage";
import { auth } from "@/lib/members-content";
import { safeNext } from "@/lib/site";
import { publicSupabaseEnv } from "@/lib/supabase/env";

export const metadata: Metadata = { title: "Join free · The Power Shift" };

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export default async function SignUpPage({ searchParams }: Props) {
  const params = await searchParams;
  return (
    <>
      <AuthHeading eyebrow={auth.signUp.eyebrow} title={auth.signUp.title} lead={auth.signUp.lead} />
      {publicSupabaseEnv() ? (
        <SignUpForm next={safeNext(params.next)} />
      ) : (
        <FormMessage tone="error" className="mt-8">{auth.notConfigured}</FormMessage>
      )}
    </>
  );
}
