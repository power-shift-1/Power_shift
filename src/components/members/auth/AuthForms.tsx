"use client";

import Link from "next/link";
import { useActionState } from "react";

import {
  requestPasswordReset,
  signIn,
  signInWithGoogle,
  signUp,
  updatePassword,
  type AuthState,
} from "@/app/(auth)/actions";
import { Field } from "@/components/members/Field";
import { FormMessage } from "@/components/members/FormMessage";
import { SubmitButton } from "@/components/members/SubmitButton";
import { auth } from "@/lib/members-content";

const withNext = (path: string, next: string) => (next === "/dashboard" ? path : `${path}?next=${encodeURIComponent(next)}`);

function Messages({ state, initial }: { state: AuthState; initial?: string }) {
  const message = state.message ?? (state.notice ? undefined : initial);
  return (
    <>
      {message ? <FormMessage tone="error">{message}</FormMessage> : null}
      {state.notice ? <FormMessage tone="ok">{state.notice}</FormMessage> : null}
    </>
  );
}

function GoogleButton({ next }: { next: string }) {
  return (
    <form action={signInWithGoogle} className="mt-8 border-t border-rule pt-8">
      <input type="hidden" name="next" value={next} />
      <SubmitButton label={auth.signIn.google} variant="reserve-quiet" size="default" className="w-full" />
    </form>
  );
}

export function SignInForm({ next, initialMessage }: { next: string; initialMessage?: string }) {
  const [state, action] = useActionState(signIn, {});
  return (
    <>
      <form action={action} noValidate className="mt-8 flex flex-col gap-5">
        <input type="hidden" name="next" value={next} />
        <Field id="email" name="email" type="email" label={auth.fields.email} autoComplete="email" inputMode="email" required defaultValue={state.values?.email} error={state.fieldErrors?.email} />
        <Field id="password" name="password" type="password" label={auth.fields.password} autoComplete="current-password" required error={state.fieldErrors?.password} />
        <Messages state={state} initial={initialMessage} />
        <SubmitButton label={auth.signIn.submit} pendingLabel={auth.signIn.pending} arrow size="lg" className="w-full justify-between" />
        <Link href="/forgot-password" className="t-note self-start underline underline-offset-4">
          {auth.signIn.forgot}
        </Link>
      </form>
      <GoogleButton next={next} />
      <p className="t-note mt-6 text-fg-soft">
        {auth.signIn.switchPrompt}{" "}
        <Link href={withNext("/sign-up", next)} className="text-fg underline underline-offset-4">
          {auth.signIn.switchLink}
        </Link>
      </p>
    </>
  );
}

export function SignUpForm({ next }: { next: string }) {
  const [state, action] = useActionState(signUp, {});
  if (state.notice) return <FormMessage tone="ok" className="mt-8">{state.notice}</FormMessage>;
  return (
    <>
      <form action={action} noValidate className="mt-8 flex flex-col gap-5">
        <Field id="name" name="name" label={auth.fields.name} autoComplete="name" required defaultValue={state.values?.name} error={state.fieldErrors?.name} />
        <Field id="email" name="email" type="email" label={auth.fields.email} autoComplete="email" inputMode="email" required defaultValue={state.values?.email} error={state.fieldErrors?.email} />
        <Field id="password" name="password" type="password" label={auth.fields.password} autoComplete="new-password" required minLength={8} hint={auth.fields.passwordHint} error={state.fieldErrors?.password} />
        <Messages state={state} />
        <SubmitButton label={auth.signUp.submit} pendingLabel={auth.signUp.pending} arrow size="lg" className="w-full justify-between" />
      </form>
      <GoogleButton next={next} />
      <p className="t-note mt-6 text-fg-soft">
        {auth.signUp.switchPrompt}{" "}
        <Link href={withNext("/sign-in", next)} className="text-fg underline underline-offset-4">
          {auth.signUp.switchLink}
        </Link>
      </p>
    </>
  );
}

export function ForgotPasswordForm() {
  const [state, action] = useActionState(requestPasswordReset, {});
  return (
    <form action={action} noValidate className="mt-8 flex flex-col gap-5">
      <Field id="email" name="email" type="email" label={auth.fields.email} autoComplete="email" inputMode="email" required defaultValue={state.values?.email} error={state.fieldErrors?.email} />
      <Messages state={state} />
      <SubmitButton label={auth.forgot.submit} pendingLabel={auth.forgot.pending} arrow size="lg" className="w-full justify-between" />
      <Link href="/sign-in" className="t-note self-start underline underline-offset-4">
        {auth.forgot.back}
      </Link>
    </form>
  );
}

export function NewPasswordForm() {
  const [state, action] = useActionState(updatePassword, {});
  return (
    <form action={action} noValidate className="mt-6 flex max-w-[480px] flex-col gap-5">
      <Field id="password" name="password" type="password" label={auth.fields.newPassword} autoComplete="new-password" required minLength={8} hint={auth.fields.passwordHint} error={state.fieldErrors?.password} />
      <Messages state={state} />
      <SubmitButton label={auth.newPassword.submit} pendingLabel={auth.newPassword.pending} className="self-start" />
    </form>
  );
}
