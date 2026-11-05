import { grantRazorpayPurchase, revokeRefundedPurchase } from "@/lib/purchases";
import { isValidWebhookSignature } from "@/lib/razorpay";
import { getSupabase } from "@/lib/supabase";

type Entity = { id?: string; order_id?: string; payment_id?: string; amount?: number; amount_refunded?: number };
type WebhookEvent = { event?: string; payload?: Record<string, { entity?: Entity } | undefined> };

/**
 * Razorpay's record of payments, and the source of truth: it grants the course even if the buyer
 * closed the tab before Checkout reported back, and a full refund takes it away again.
 * Answers 2xx once an event is handled or safely ignored, and 5xx so Razorpay retries after a failure.
 */
export async function POST(request: Request) {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  const admin = getSupabase();
  if (!secret || !admin) {
    console.error("[razorpay] RAZORPAY_WEBHOOK_SECRET or the Supabase secret key is not set.");
    return new Response("Not configured", { status: 503 });
  }

  const raw = await request.text();
  if (!isValidWebhookSignature(raw, request.headers.get("x-razorpay-signature"), secret)) {
    return new Response("Bad signature", { status: 400 });
  }

  let event: WebhookEvent;
  try {
    event = JSON.parse(raw) as WebhookEvent;
  } catch {
    return new Response("Bad body", { status: 400 });
  }
  const payment = event.payload?.payment?.entity;
  const order = event.payload?.order?.entity;
  const refund = event.payload?.refund?.entity;

  try {
    switch (event.event) {
      case "order.paid":
      case "payment.captured": {
        const orderId = order?.id ?? payment?.order_id;
        if (orderId && payment?.id) {
          const result = await grantRazorpayPurchase(admin, orderId, payment.id);
          if (!result.granted) console.warn(`[razorpay] ${event.event} for an order this site did not create: ${orderId}`);
        }
        break;
      }
      case "refund.processed":
      case "payment.refunded": {
        const paymentId = payment?.id ?? refund?.payment_id;
        const refunded = payment?.amount_refunded ?? refund?.amount ?? 0;
        if (paymentId) await revokeRefundedPurchase(admin, paymentId, refunded);
        break;
      }
    }
  } catch (error) {
    console.error(`[razorpay] Could not handle ${event.event}:`, error);
    return new Response("Try again", { status: 500 });
  }

  return Response.json({ ok: true });
}
