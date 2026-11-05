import type { Metadata } from "next";

import { AuthHeading } from "@/components/members/auth/AuthHeading";
import { ForgotPasswordForm } from "@/components/members/auth/AuthForms";
import { auth } from "@/lib/members-content";

export const metadata: Metadata = { title: "Reset your password · The Power Shift" };

export default function ForgotPasswordPage() {
  return (
    <>
      <AuthHeading eyebrow={auth.forgot.eyebrow} title={auth.forgot.title} lead={auth.forgot.lead} />
      <ForgotPasswordForm />
    </>
  );
}
