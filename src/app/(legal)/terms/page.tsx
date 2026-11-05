import type { Metadata } from "next";

import { LegalSection, LegalTitle } from "@/components/members/Legal";
import { business } from "@/lib/members-content";

export const metadata: Metadata = { title: "Terms · The Power Shift" };

export default function TermsPage() {
  return (
    <>
      <LegalTitle eyebrow="Terms" title="Terms of use" />
      <p className="t-body text-fg-soft">
        These terms cover the website, member accounts and courses offered by {business.legalName}. By creating an account or buying a
        course, you agree to them.
      </p>
      <LegalSection title="Your account">
        <p>Keep your sign-in details to yourself. You are responsible for what happens under your account, and one account is for one person.</p>
      </LegalSection>
      <LegalSection title="Courses">
        <ul>
          <li>A course is a one-time purchase in Indian rupees, and gives you access to its lessons and its community room for as long as the course is offered.</li>
          <li>Course videos are for your own learning. Please don&apos;t record, share or resell them.</li>
          <li>Coaching content is educational. It is not medical, psychological, legal or financial advice.</li>
        </ul>
      </LegalSection>
      <LegalSection title="Payments">
        <p>Payments are processed by Razorpay. We never see or store your card, UPI or bank details. Refunds follow our refund policy.</p>
      </LegalSection>
      <LegalSection title="The community">
        <p>
          Be kind and respectful. We may remove messages and stop accounts from posting when they harass others, share others&apos;
          private information, or advertise.
        </p>
      </LegalSection>
      <LegalSection title="Changes and contact">
        <p>
          We may update these terms, and the date at the foot of the page shows the latest version. Questions: {business.email}.
        </p>
      </LegalSection>
    </>
  );
}
