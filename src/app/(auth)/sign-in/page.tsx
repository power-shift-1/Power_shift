import type { Metadata } from "next";

import { AuthHeading } from "@/components/members/auth/AuthHeading";
import { SignInForm } from "@/components/members/auth/AuthForms";
import { FormMessage } from "@/components/members/FormMessage";
import { auth } from "@/lib/members-content";
import { safeNext } from "@/lib/site";
import { publicSupabaseEnv } from "@/lib/supabase/env";

export const metadata: Metadata = { title: "Sign in · The Power Shift" };

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

const ERRORS: Record<string, string> = { link: auth.signIn.linkFailed, google: auth.errors.google };

export default async function SignInPage({ searchParams }: Props) {
  const params = await searchParams;
  const error = typeof params.error === "string" ? ERRORS[params.error] : undefined;
  return (
    <>
      <AuthHeading eyebrow={auth.signIn.eyebrow} title={auth.signIn.title} lead={auth.signIn.lead} />
      {publicSupabaseEnv() ? (
        <SignInForm next={safeNext(params.next)} initialMessage={error} />
      ) : (
        <FormMessage tone="error" className="mt-8">{auth.notConfigured}</FormMessage>
      )}
    </>
  );
}
