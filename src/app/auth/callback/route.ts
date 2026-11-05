import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";

import { safeNext } from "@/lib/site";
import { createUserClient } from "@/lib/supabase/server";

const OTP_TYPES: EmailOtpType[] = ["signup", "invite", "magiclink", "recovery", "email_change", "email"];

/**
 * Where Google sign-in and the links in confirmation and password emails come back to.
 * Handles both the code flow and the token_hash links of customised email templates.
 */
export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const next = safeNext(url.searchParams.get("next"));
  const supabase = await createUserClient();
  if (!supabase) return NextResponse.redirect(new URL("/sign-in", url));

  const code = url.searchParams.get("code");
  const tokenHash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type") as EmailOtpType | null;

  let error: { code?: string; message: string } | null = { message: "No code in the link." };
  if (code) {
    ({ error } = await supabase.auth.exchangeCodeForSession(code));
  } else if (tokenHash && type && OTP_TYPES.includes(type)) {
    ({ error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash }));
  }

  if (error) {
    console.error("[auth] Callback failed:", error.code, error.message);
    return NextResponse.redirect(new URL("/sign-in?error=link", url));
  }
  return NextResponse.redirect(new URL(next, url));
}
