"use client";

import { Dialog } from "radix-ui";
import { useState, useTransition } from "react";

import { reportMessage } from "@/app/(app)/chat/actions";
import { FormMessage } from "@/components/members/FormMessage";
import { Button } from "@/components/ui/button";
import type { ChatMessage } from "@/lib/chat";
import { community } from "@/lib/members-content";

/** Asks for an optional reason, then files the report. Admins are notified by the database. */
export function ReportDialog({ message, onClose }: { message: ChatMessage | null; onClose: () => void }) {
  const [reason, setReason] = useState("");
  const [result, setResult] = useState<"ok" | "error" | null>(null);
  const [pending, startTransition] = useTransition();

  function close() {
    setReason("");
    setResult(null);
    onClose();
  }

  return (
    <Dialog.Root open={message !== null} onOpenChange={(open) => (open ? null : close())}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-[rgb(14_15_18/.45)] data-[state=open]:animate-in data-[state=open]:fade-in-0" />
        <Dialog.Content
          data-stock="paper"
          className="fixed top-1/2 left-1/2 z-50 w-[min(460px,calc(100vw-32px))] -translate-x-1/2 -translate-y-1/2 border border-rule p-6 shadow-[0_24px_60px_rgb(14_15_18/.25)] outline-none"
        >
          <Dialog.Title className="font-display text-[1.75rem] leading-[1.15]">{community.reportTitle}</Dialog.Title>
          {message ? (
            <Dialog.Description className="mt-3 border-l-2 border-l-gold-line pl-3 font-ui text-[14px] text-fg-soft">
              <span className="font-semibold">{message.author_name}</span>: <span className="line-clamp-3">{message.body}</span>
            </Dialog.Description>
          ) : null}
          {result === "ok" ? (
            <>
              <FormMessage tone="ok" className="mt-6">
                {community.reportThanks}
              </FormMessage>
              <Button type="button" variant="reserve" size="default" className="mt-6" onClick={close}>
                {community.done}
              </Button>
            </>
          ) : (
            <form
              className="mt-6 flex flex-col gap-4"
              onSubmit={(event) => {
                event.preventDefault();
                if (!message) return;
                startTransition(async () => {
                  const sent = await reportMessage(message.id, reason);
                  setResult(sent.ok ? "ok" : "error");
                });
              }}
            >
              <label htmlFor="report-reason" className="font-ui text-[15px] font-medium">
                {community.reportReason}
              </label>
              <textarea
                id="report-reason"
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                maxLength={500}
                rows={3}
                className="w-full border-[1.5px] border-t-soft bg-transparent p-3 font-ui text-[16px] outline-none focus-visible:border-t-ink"
              />
              {result === "error" ? <FormMessage tone="error">{community.reportFailed}</FormMessage> : null}
              <div className="flex flex-wrap gap-3">
                <Button type="submit" variant="reserve" size="default" aria-busy={pending || undefined} disabled={pending}>
                  {community.reportSend}
                </Button>
                <Dialog.Close asChild>
                  <Button type="button" variant="ghost" size="default" className="font-ui">
                    {community.cancel}
                  </Button>
                </Dialog.Close>
              </div>
            </form>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
