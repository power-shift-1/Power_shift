import type { Metadata } from "next";
import Link from "next/link";

import { signOut } from "@/app/(auth)/actions";
import { ActionForm } from "@/components/members/ActionForm";
import { AvatarUpload } from "@/components/members/AvatarUpload";
import { Field, TextAreaField } from "@/components/members/Field";
import { Empty, PageIntro, Panel } from "@/components/members/PageIntro";
import { SubmitButton } from "@/components/members/SubmitButton";
import { requireMember } from "@/lib/auth";
import { formatDate, formatPrice } from "@/lib/format";
import { account, auth } from "@/lib/members-content";
import { createUserClient } from "@/lib/supabase/server";

import { updateProfile } from "./actions";

export const metadata: Metadata = { title: "Account · The Power Shift" };

type Purchase = {
  id: string;
  status: "paid" | "refunded";
  source: "razorpay" | "admin";
  amount_paise: number;
  payment_id: string | null;
  created_at: string;
  courses: { slug: string; title: string } | null;
};

export default async function AccountPage() {
  const member = await requireMember("/account");
  const supabase = (await createUserClient())!;
  const [{ data: purchases }, { data: profile }] = await Promise.all([
    supabase
      .from("purchases")
      .select("id, status, source, amount_paise, payment_id, created_at, courses(slug, title)")
      .order("created_at", { ascending: false })
      .overrideTypes<Purchase[], { merge: false }>(),
    supabase.from("profiles").select("attended_masterclass, bio").eq("id", member.id).maybeSingle(),
  ]);

  return (
    <div className="flex flex-col gap-12">
      <PageIntro eyebrow={account.eyebrow} title={account.title}>
        <form action={signOut}>
          <SubmitButton label={account.signOut} variant="reserve-quiet" />
        </form>
      </PageIntro>

      <div className="grid grid-cols-1 gap-12 lg:grid-cols-2">
        <Panel title={account.profileTitle}>
          <p className="font-ui text-[17px] font-semibold">{member.email}</p>
          {profile?.attended_masterclass ? <p className="t-note text-label">{account.attendee}</p> : null}
          <div className="my-6">
            <AvatarUpload memberId={member.id} name={member.name} src={member.avatarUrl} />
          </div>
          <ActionForm action={updateProfile} submitLabel={account.save} pendingLabel={account.saving}>
            <Field id="name" name="name" label={auth.fields.name} defaultValue={member.name} autoComplete="name" required maxLength={120} />
            <div>
              <TextAreaField id="bio" name="bio" label={account.bio} defaultValue={profile?.bio ?? ""} maxLength={500} />
              <p className="t-note mt-2 text-fg-soft">{account.bioHint}</p>
            </div>
          </ActionForm>
          <div className="mt-6 flex flex-wrap gap-x-6 gap-y-2">
            <Link href="/account/password" className="t-note underline underline-offset-4">
              {account.changePassword}
            </Link>
            {member.isAdmin ? (
              <Link href="/admin" className="t-note underline underline-offset-4">
                {account.admin}
              </Link>
            ) : null}
          </div>
        </Panel>

        <Panel title={account.purchasesTitle}>
          {purchases?.length ? (
            <ul className="flex flex-col divide-y divide-rule">
              {purchases.map((purchase) => (
                <li key={purchase.id} className="flex flex-wrap items-baseline justify-between gap-2 py-3">
                  <span>
                    {purchase.courses ? (
                      <Link href={`/courses/${purchase.courses.slug}`} className="font-ui text-[16px] font-semibold underline-offset-4 hover:underline">
                        {purchase.courses.title}
                      </Link>
                    ) : null}
                    <span className="t-note block text-fg-soft">
                      {formatDate(purchase.created_at)}
                      {purchase.payment_id ? ` · ${purchase.payment_id}` : ""}
                    </span>
                  </span>
                  <span className="t-note">
                    {purchase.status === "refunded"
                      ? account.refunded
                      : purchase.source === "admin"
                        ? account.granted
                        : formatPrice(purchase.amount_paise)}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <Empty>{account.purchasesEmpty}</Empty>
          )}
        </Panel>
      </div>
    </div>
  );
}
