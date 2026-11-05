"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";

import { memberClient } from "@/lib/auth";
import { courses as copy, auth } from "@/lib/members-content";
import { grantRazorpayPurchase } from "@/lib/purchases";
import { createRazorpayOrder, isValidPaymentSignature, razorpayKeys } from "@/lib/razorpay";
import { getSupabase } from "@/lib/supabase";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type StartPurchaseResult =
  | { status: "checkout"; keyId: string; orderId: string; amount: number; courseTitle: string; name: string; email: string }
  | { status: "owned" }
  | { status: "error"; message: string };

/** Creates a Razorpay order for the course at the price stored in the database, never one sent by the browser. */
export async function startPurchase(courseId: string): Promise<StartPurchaseResult> {
  const session = await memberClient();
  if (!session) return { status: "error", message: auth.errors.generic };
  const keys = razorpayKeys();
  const admin = getSupabase();
  if (!keys || !admin) return { status: "error", message: copy.buyUnavailable };
  if (!UUID.test(courseId)) return { status: "error", message: auth.errors.generic };

  const { supabase, member } = session;
  const [{ data: course }, { data: hasAccess }] = await Promise.all([
    supabase.from("courses").select("id, title, price_paise, is_published").eq("id", courseId).maybeSingle(),
    supabase.rpc("has_course_access", { target: courseId }),
  ]);
  if (!course?.is_published) return { status: "error", message: auth.errors.generic };
  if (hasAccess) return { status: "owned" };

  try {
    const order = await createRazorpayOrder(keys, {
      amountPaise: course.price_paise,
      receipt: `ps_${randomUUID().slice(0, 18)}`,
      notes: { user_id: member.id, course_id: course.id },
    });
    const { error } = await admin
      .from("orders")
      .insert({ id: order.id, user_id: member.id, course_id: course.id, amount_paise: course.price_paise });
    if (error) throw new Error(`Could not save order: ${error.message}`);

    return {
      status: "checkout",
      keyId: keys.keyId,
      orderId: order.id,
      amount: course.price_paise,
      courseTitle: course.title,
      name: member.name,
      email: member.email,
    };
  } catch (error) {
    console.error("[purchase] Could not start checkout:", error);
    return { status: "error", message: auth.errors.generic };
  }
}

export type ConfirmPurchaseResult = { ok: true } | { ok: false; message: string };

/**
 * Checkout's success handler. The signature proves Razorpay took the payment, and the order must
 * belong to this member. The webhook records the same purchase if this call never arrives.
 */
export async function confirmPurchase(input: { orderId: string; paymentId: string; signature: string }): Promise<ConfirmPurchaseResult> {
  const session = await memberClient();
  const keys = razorpayKeys();
  const admin = getSupabase();
  if (!session || !keys || !admin) return { ok: false, message: copy.buyFailed };

  const { orderId, paymentId, signature } = input;
  const wellFormed =
    /^order_[A-Za-z0-9]{6,40}$/.test(orderId) && /^pay_[A-Za-z0-9]{6,40}$/.test(paymentId) && /^[0-9a-f]{64}$/.test(signature);
  if (!wellFormed || !isValidPaymentSignature(orderId, paymentId, signature, keys.keySecret)) {
    console.warn(`[purchase] Rejected a payment confirmation with a bad signature for ${orderId}.`);
    return { ok: false, message: copy.buyFailed };
  }

  const { data: order } = await admin.from("orders").select("user_id").eq("id", orderId).maybeSingle();
  if (order?.user_id !== session.member.id) return { ok: false, message: copy.buyFailed };

  try {
    await grantRazorpayPurchase(admin, orderId, paymentId);
  } catch (error) {
    console.error("[purchase] Could not record a confirmed payment:", error);
    return { ok: false, message: copy.buyFailed };
  }
  revalidatePath("/courses", "layout");
  return { ok: true };
}

/** Remembers the lesson for the dashboard's Continue watching. Row level security refuses locked lessons. */
export async function markLessonSeen(lessonId: string) {
  if (!UUID.test(lessonId)) return;
  const session = await memberClient();
  if (!session) return;
  await session.supabase
    .from("lesson_progress")
    .upsert({ user_id: session.member.id, lesson_id: lessonId, last_seen_at: new Date().toISOString() }, { onConflict: "user_id,lesson_id" });
}

/** Ticks a lesson off, or back on. The upsert only touches the columns it names, so the watch time survives. */
export async function setLessonComplete(lessonId: string, complete: boolean): Promise<{ ok: boolean }> {
  if (!UUID.test(lessonId)) return { ok: false };
  const session = await memberClient();
  if (!session) return { ok: false };
  const now = new Date().toISOString();
  const { error } = await session.supabase
    .from("lesson_progress")
    .upsert(
      { user_id: session.member.id, lesson_id: lessonId, last_seen_at: now, completed_at: complete ? now : null },
      { onConflict: "user_id,lesson_id" },
    );
  if (error) console.error("[progress] Could not save completion:", error.code, error.message);
  revalidatePath("/", "layout");
  return { ok: !error };
}
