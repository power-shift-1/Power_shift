import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

// Postgres unique_violation: the other path (Checkout or the webhook) recorded it first.
const ALREADY_RECORDED = "23505";

/**
 * Gives the order's buyer the course. Checkout's success handler and the webhook both call this,
 * in either order and any number of times, so it only ever records one purchase.
 * Needs the secret-key client: members cannot write purchases themselves.
 */
export async function grantRazorpayPurchase(admin: SupabaseClient, orderId: string, paymentId: string) {
  const { data: order, error: orderError } = await admin
    .from("orders")
    .select("id, user_id, course_id, amount_paise")
    .eq("id", orderId)
    .maybeSingle();
  if (orderError) throw new Error(`Could not read order ${orderId}: ${orderError.message}`);
  if (!order) return { granted: false as const, reason: "unknown-order" };

  const { data: existing, error: readError } = await admin
    .from("purchases")
    .select("id, status, payment_id")
    .eq("user_id", order.user_id)
    .eq("course_id", order.course_id)
    .maybeSingle();
  if (readError) throw new Error(`Could not read purchases: ${readError.message}`);

  const row = {
    status: "paid",
    source: "razorpay",
    amount_paise: order.amount_paise,
    order_id: order.id,
    payment_id: paymentId,
  };

  if (!existing) {
    const { error } = await admin.from("purchases").insert({ user_id: order.user_id, course_id: order.course_id, ...row });
    if (error && error.code !== ALREADY_RECORDED) throw new Error(`Could not record purchase: ${error.message}`);
  } else if (existing.status === "refunded") {
    const { error } = await admin.from("purchases").update(row).eq("id", existing.id);
    if (error) throw new Error(`Could not restore purchase: ${error.message}`);
  } else if (existing.payment_id && existing.payment_id !== paymentId) {
    // Paid twice for the same course. Access is unchanged; the team can refund the second payment.
    console.warn(`[purchases] ${paymentId} is a second payment for a course already owned (${existing.payment_id}).`);
  }

  await admin.from("orders").update({ status: "paid" }).eq("id", order.id);
  return { granted: true as const, userId: order.user_id as string, courseId: order.course_id as string };
}

/** A fully refunded payment takes the course away again. */
export async function revokeRefundedPurchase(admin: SupabaseClient, paymentId: string, refundedPaise: number) {
  const { data: purchase, error } = await admin
    .from("purchases")
    .select("id, amount_paise")
    .eq("payment_id", paymentId)
    .maybeSingle();
  if (error) throw new Error(`Could not read purchase for ${paymentId}: ${error.message}`);
  if (!purchase || refundedPaise < purchase.amount_paise) return false;

  const { error: updateError } = await admin.from("purchases").update({ status: "refunded" }).eq("id", purchase.id);
  if (updateError) throw new Error(`Could not mark ${paymentId} refunded: ${updateError.message}`);
  return true;
}
