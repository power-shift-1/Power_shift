import type { Metadata } from "next";

import { LegalSection, LegalTitle } from "@/components/members/Legal";
import { business } from "@/lib/members-content";

export const metadata: Metadata = { title: "Privacy · The Power Shift" };

export default function PrivacyPage() {
  return (
    <>
      <LegalTitle eyebrow="Privacy" title="How we use your details" />
      <LegalSection title="What we collect">
        <ul>
          <li>Your name and email, when you reserve a masterclass seat or create an account.</li>
          <li>Your Google name and picture, if you sign in with Google.</li>
          <li>The courses you buy and the lessons you watch, so you can pick up where you left off.</li>
          <li>Messages you post in the community.</li>
        </ul>
      </LegalSection>
      <LegalSection title="Who handles it">
        <p>
          Accounts and data are stored with Supabase. Payments are handled by Razorpay, which receives what it needs to take the payment.
          Videos play from YouTube or Vimeo. The site is hosted on Vercel. We don&apos;t sell your details.
        </p>
      </LegalSection>
      <LegalSection title="Your choices">
        <p>
          You can change your name on your account page. To get a copy of your data or have your account deleted, write to {business.email}{" "}
          and we&apos;ll reply within 30 days. Payment records are kept as long as tax law requires.
        </p>
      </LegalSection>
    </>
  );
}
