import type { Metadata } from "next";

import { LegalSection, LegalTitle } from "@/components/members/Legal";
import { business } from "@/lib/members-content";

export const metadata: Metadata = { title: "Contact · The Power Shift" };

export default function ContactPage() {
  return (
    <>
      <LegalTitle eyebrow="Contact" title="Get in touch" />
      <LegalSection title={business.legalName}>
        <ul className="list-none! pl-0!">
          <li>
            Email: <a href={`mailto:${business.email}`} className="underline underline-offset-4">{business.email}</a>
          </li>
          {business.phone ? <li>Phone: {business.phone}</li> : null}
          {business.address ? <li>Address: {business.address}</li> : null}
        </ul>
        <p>We reply to emails within two working days.</p>
      </LegalSection>
    </>
  );
}
