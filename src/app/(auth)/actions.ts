"use server";

import type { AuthError } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import { z } from "zod";

import { auth } from "@/lib/members-content";
import { safeNext, siteOrigin } from "@/lib/site";
import { createUserClient } from "@/lib/supabase/server";

type FieldName = "name" | "email" | "password";

export type AuthState = {
  message?: string;
  notice?: string;
  fieldErrors?: Partial<Record<FieldName, string>>;
  values?: { name?: string; email?: string };
};

const emailSchema = z.string().trim().pipe(z.email(auth.errors.email).max(254, auth.errors.email));
const newPasswordSchema = z.string().min(8, auth.errors.password).max(72, auth.errors.passwordLong);
const nameSchema = z
  .string()
  .trim()
  .min(1, auth.errors.name)
  .max(120, auth.errors.name)
  .refine((name) => !/[\p{Cc}\p{Zl}\p{Zp}]/u.test(name), auth.errors.name);

function fieldErrors(error: z.ZodError): AuthState["fieldErrors"] {
  const { fieldErrors: errors } = z.flattenError(error) as { fieldErrors: Partial<Record<FieldName, string[]>> };
  return { name: errors.name?.[0], email: errors.email?.[0], password: errors.password?.[0] };
}

function describe(error: AuthError, context: string) {
  if (error.code === "invalid_credentials") return auth.signIn.badCredentials;
  if (error.code === "email_not_confirmed") return auth.signIn.unconfirmed;
  if (error.code === "weak_password") return error.message;
  if (error.status === 429 || error.code?.startsWith("over_")) return auth.errors.rateLimited;
  console.error(`[auth] ${context} failed:`, error.code, error.message);
  return auth.errors.generic;
}

export async function signIn(_previous: AuthState, formData: FormData): Promise<AuthState> {
  const values = { email: String(formData.get("email") ?? "") };
  const parsed = z
    .object({ email: emailSchema, password: z.string().min(1, auth.errors.password) })
    .safeParse({ email: values.email, password: String(formData.get("password") ?? "") });
  if (!parsed.success) return { values, fieldErrors: fieldErrors(parsed.error) };

  const supabase = await createUserClient();
  if (!supabase) return { values, message: auth.notConfigured };

  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) return { values, message: describe(error, "Sign-in") };

  redirect(safeNext(formData.get("next")));
}

export async function signUp(_previous: AuthState, formData: FormData): Promise<AuthState> {
  const values = { name: String(formData.get("name") ?? ""), email: String(formData.get("email") ?? "") };
  const parsed = z
    .object({ name: nameSchema, email: emailSchema, password: newPasswordSchema })
    .safeParse({ ...values, password: String(formData.get("password") ?? "") });
  if (!parsed.success) return { values, fieldErrors: fieldErrors(parsed.error) };

  const supabase = await createUserClient();
  if (!supabase) return { values, message: auth.notConfigured };

  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: { full_name: parsed.data.name },
      emailRedirectTo: `${await siteOrigin()}/auth/callback?next=/dashboard`,
    },
  });
  // An existing email gets the same answer as a new one, so the form can't be used to find out who has an account.
  if (error && error.code !== "user_already_exists") return { values, message: describe(error, "Sign-up") };
  if (data.session) redirect("/dashboard");
  return { notice: auth.signUp.checkInbox };
}

export async function signInWithGoogle(formData: FormData) {
  const supabase = await createUserClient();
  if (!supabase) redirect("/sign-in");

  const next = safeNext(formData.get("next"));
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: `${await siteOrigin()}/auth/callback?next=${encodeURIComponent(next)}` },
  });
  if (error || !data.url) {
    if (error) console.error("[auth] Google sign-in failed:", error.code, error.message);
    redirect("/sign-in?error=google");
  }
  redirect(data.url);
}

export async function requestPasswordReset(_previous: AuthState, formData: FormData): Promise<AuthState> {
  const values = { email: String(formData.get("email") ?? "") };
  const parsed = emailSchema.safeParse(values.email);
  if (!parsed.success) return { values, fieldErrors: { email: auth.errors.email } };

  const supabase = await createUserClient();
  if (!supabase) return { values, message: auth.notConfigured };

  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data, {
    redirectTo: `${await siteOrigin()}/auth/callback?next=/account/password`,
  });
  if (error && (error.status === 429 || error.code?.startsWith("over_"))) return { values, message: auth.errors.rateLimited };
  if (error) console.error("[auth] Password reset failed:", error.code, error.message);
  return { notice: auth.forgot.sent };
}

export async function updatePassword(_previous: AuthState, formData: FormData): Promise<AuthState> {
  const parsed = newPasswordSchema.safeParse(String(formData.get("password") ?? ""));
  if (!parsed.success) return { fieldErrors: { password: parsed.error.issues[0]?.message } };

  const supabase = await createUserClient();
  if (!supabase) return { message: auth.notConfigured };

  const { error } = await supabase.auth.updateUser({ password: parsed.data });
  if (error?.code === "same_password") return { notice: auth.newPassword.saved };
  if (error) return { message: describe(error, "Password change") };
  return { notice: auth.newPassword.saved };
}

export async function signOut() {
  const supabase = await createUserClient();
  await supabase?.auth.signOut();
  redirect("/");
}
