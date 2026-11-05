import type { Metadata } from "next";

import { LegalSection, LegalTitle } from "@/components/members/Legal";
import { business } from "@/lib/members-content";

export const metadata: Metadata = { title: "Refunds · The Power Shift" };

export default function RefundsPage() {
  return (
    <>
      <LegalTitle eyebrow="Refunds" title="Refund and cancellation policy" />
      <LegalSection title="Courses">
        <p>
          If a course isn&apos;t right for you, write to {business.email} within {business.refundDays} days of buying it, with the email on your
          account. We&apos;ll refund the full amount to the original payment method.
        </p>
        <p>Razorpay usually returns the money within 5 to 7 working days. Once a refund is processed, the course leaves your account.</p>
      </LegalSection>
      <LegalSection title="Failed or duplicate payments">
        <p>If you were charged but the course didn&apos;t appear, or you were charged twice, write to us with the payment ID from your Razorpay receipt and we&apos;ll fix it or refund the extra payment.</p>
      </LegalSection>
      <LegalSection title="Free masterclass">
        <p>The live masterclass is free, so there is nothing to refund. You can cancel your seat by writing to us.</p>
      </LegalSection>
    </>
  );
}
