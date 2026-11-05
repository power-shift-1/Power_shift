import type { Metadata } from "next";

import { NewPasswordForm } from "@/components/members/auth/AuthForms";
import { PageIntro } from "@/components/members/PageIntro";
import { requireMember } from "@/lib/auth";
import { account, auth } from "@/lib/members-content";

export const metadata: Metadata = { title: "Change password · The Power Shift" };

/** Also where the password reset email lands, already signed in by the callback. */
export default async function PasswordPage() {
  await requireMember("/account/password");
  return (
    <div>
      <PageIntro eyebrow={account.eyebrow} title={auth.newPassword.title} />
      <NewPasswordForm />
    </div>
  );
}
