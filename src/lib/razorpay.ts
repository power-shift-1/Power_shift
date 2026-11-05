import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";

// RAZORPAY_API_URL exists only so tests can point the site at a stand-in.
const API_URL = process.env.RAZORPAY_API_URL || "https://api.razorpay.com/v1";
const TIMEOUT_MS = 10_000;

/** The API key pair, or null while payments are not set up. Test keys start with rzp_test_. */
export function razorpayKeys() {
  const keyId = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  return keyId && keySecret ? { keyId, keySecret } : null;
}

export async function createRazorpayOrder(
  keys: { keyId: string; keySecret: string },
  order: { amountPaise: number; receipt: string; notes: Record<string, string> },
) {
  const response = await fetch(`${API_URL}/orders`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${keys.keyId}:${keys.keySecret}`).toString("base64")}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ amount: order.amountPaise, currency: "INR", receipt: order.receipt, notes: order.notes }),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!response.ok) {
    throw new Error(`Razorpay order failed: ${response.status} ${(await response.text()).slice(0, 300)}`);
  }
  const body = (await response.json()) as { id?: unknown; amount?: unknown };
  if (typeof body.id !== "string" || body.amount !== order.amountPaise) {
    throw new Error("Razorpay returned an unexpected order.");
  }
  return { id: body.id };
}

/** Checkout's success handler is genuine only if this signature matches. */
export function isValidPaymentSignature(orderId: string, paymentId: string, signature: string, keySecret: string) {
  return safeEqualHex(hmac(`${orderId}|${paymentId}`, keySecret), signature);
}

/** A webhook is genuine only if its X-Razorpay-Signature matches the raw body. */
export function isValidWebhookSignature(rawBody: string, signature: string | null, webhookSecret: string) {
  return signature !== null && safeEqualHex(hmac(rawBody, webhookSecret), signature);
}

function hmac(message: string, secret: string) {
  return createHmac("sha256", secret).update(message).digest("hex");
}

function safeEqualHex(expected: string, given: string) {
  const a = Buffer.from(expected, "utf8");
  const b = Buffer.from(given, "utf8");
  return a.length === b.length && timingSafeEqual(a, b);
}
