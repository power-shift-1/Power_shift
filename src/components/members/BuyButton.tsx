"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { confirmPurchase, startPurchase } from "@/app/(app)/courses/actions";
import { Arrow } from "@/components/shared/Arrow";
import { Button } from "@/components/ui/button";
import { brand } from "@/lib/content";
import { courses as copy } from "@/lib/members-content";

import { FormMessage } from "./FormMessage";

type CheckoutResponse = { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string };
type RazorpayCheckout = new (options: Record<string, unknown>) => {
  open: () => void;
  on: (event: "payment.failed", handler: () => void) => void;
};
declare global {
  interface Window {
    Razorpay?: RazorpayCheckout;
  }
}

const CHECKOUT_SCRIPT = "https://checkout.razorpay.com/v1/checkout.js";

function loadCheckout() {
  if (window.Razorpay) return Promise.resolve(true);
  return new Promise<boolean>((resolve) => {
    const script = document.createElement("script");
    script.src = CHECKOUT_SCRIPT;
    script.onload = () => resolve(Boolean(window.Razorpay));
    script.onerror = () => resolve(false);
    document.head.append(script);
  });
}

type Phase = "idle" | "opening" | "paying" | "confirming" | "done";

export function BuyButton({ courseId, price }: { courseId: string; price: string }) {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>("idle");
  const [message, setMessage] = useState<string | null>(null);

  async function buy() {
    setPhase("opening");
    setMessage(null);
    const [started, loaded] = await Promise.all([startPurchase(courseId), loadCheckout()]);
    if (started.status === "owned") {
      setPhase("done");
      router.refresh();
      return;
    }
    if (started.status === "error" || !loaded || !window.Razorpay) {
      setPhase("idle");
      setMessage(started.status === "error" ? started.message : copy.buyFailed);
      return;
    }

    const checkout = new window.Razorpay({
      key: started.keyId,
      order_id: started.orderId,
      amount: started.amount,
      currency: "INR",
      name: brand.name,
      description: started.courseTitle,
      prefill: { name: started.name, email: started.email },
      theme: { color: "#a8281f" },
      handler: async (response: CheckoutResponse) => {
        setPhase("confirming");
        const result = await confirmPurchase({
          orderId: response.razorpay_order_id,
          paymentId: response.razorpay_payment_id,
          signature: response.razorpay_signature,
        });
        if (result.ok) {
          setPhase("done");
          setMessage(copy.buyDone);
          router.refresh();
        } else {
          setPhase("idle");
          setMessage(result.message);
        }
      },
      modal: { ondismiss: () => setPhase((current) => (current === "paying" ? "idle" : current)) },
    });
    checkout.on("payment.failed", () => setMessage(copy.buyFailed));
    setPhase("paying");
    checkout.open();
  }

  const busy = phase === "opening" || phase === "confirming";
  return (
    <div className="flex flex-col gap-3">
      <Button
        type="button"
        variant="reserve"
        size="lg"
        onClick={buy}
        disabled={phase === "done"}
        aria-busy={busy || undefined}
        aria-disabled={busy || undefined}
        className="w-full justify-between text-left whitespace-normal"
      >
        <span>{phase === "opening" ? copy.buyPending : phase === "confirming" ? copy.buyConfirming : copy.buy(price)}</span>
        <Arrow />
      </Button>
      <p className="t-note text-fg-soft">{copy.buyNote}</p>
      {message ? <FormMessage tone={phase === "done" ? "ok" : "error"}>{message}</FormMessage> : null}
    </div>
  );
}
