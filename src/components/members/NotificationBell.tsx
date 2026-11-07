"use client";

import { Bell, CalendarClock, Flag, Megaphone, MessageCircle } from "lucide-react";
import Link from "next/link";
import { Popover } from "radix-ui";
import { useEffect, useRef, useState } from "react";

import { clearNotifications, markNotificationsRead } from "@/app/(app)/notifications/actions";
import { formatDateTime } from "@/lib/format";
import { notifications as copy } from "@/lib/members-content";
import type { Notice, SoonSession } from "@/lib/notifications";
import { getBrowserClient } from "@/lib/supabase/browser";

const ICONS = { announcement: Megaphone, reply: MessageCircle, report: Flag } as const;

type Props = { memberId: string; initial: { items: Notice[]; unread: number; soon: SoonSession[] } };

/**
 * The header bell. New notifications arrive live. Unread ones keep their dot while the panel is open
 * and are marked read when it closes. MemberHeader keys this by member, so a new sign-in starts fresh.
 */
export function NotificationBell({ memberId, initial }: Props) {
  const [items, setItems] = useState(initial.items);
  const [unread, setUnread] = useState(initial.unread);
  // Sessions starting soon count towards the badge only until the panel has been opened once.
  const [seenSoon, setSeenSoon] = useState(false);
  const panel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const supabase = getBrowserClient();
    if (!supabase) return;
    const channel = supabase
      .channel(`notifications:${memberId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${memberId}` }, (payload) => {
        const notice = payload.new as Notice;
        setItems((current) => [notice, ...current.filter((item) => item.id !== notice.id)].slice(0, 15));
        setUnread((count) => count + 1);
      })
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [memberId]);

  function onOpenChange(open: boolean) {
    if (open) {
      setSeenSoon(true);
      return;
    }
    if (unread === 0) return;
    const shown = items.filter((item) => !item.read_at).map((item) => item.id);
    setUnread(0);
    setItems((current) => current.map((item) => (item.read_at ? item : { ...item, read_at: "read" })));
    // Older unread ones beyond the 15 shown are marked too, so the badge doesn't come back.
    void markNotificationsRead(shown.length === unread ? shown : undefined);
  }

  function clear() {
    setItems([]);
    setUnread(0);
    void clearNotifications();
    panel.current?.focus();
  }

  const soon = seenSoon ? 0 : initial.soon.length;
  const badge = unread + soon;
  return (
    <Popover.Root onOpenChange={onOpenChange}>
      <Popover.Trigger
        aria-label={copy.open(unread, soon)}
        className="relative grid size-11 place-items-center text-fg transition-colors hover:text-fg-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus)]"
      >
        <Bell aria-hidden="true" className="size-5" />
        {badge ? (
          <span aria-hidden="true" className="absolute top-1.5 right-1.5 grid min-w-[18px] place-items-center rounded-full bg-red px-1 font-ui text-[11px] leading-[18px] font-bold text-white">
            {badge > 9 ? "9+" : badge}
          </span>
        ) : null}
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          ref={panel}
          tabIndex={-1}
          aria-label={copy.title}
          align="end"
          sideOffset={8}
          collisionPadding={12}
          data-stock="paper"
          // Focus the panel itself rather than its first button, which is the destructive Clear.
          onOpenAutoFocus={(event) => {
            event.preventDefault();
            panel.current?.focus();
          }}
          className="z-50 w-[min(380px,calc(100vw-24px))] border border-rule shadow-[0_18px_44px_rgb(14_15_18/.18)] outline-none data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 motion-reduce:animate-none"
        >
          <div className="flex items-center justify-between border-b border-rule px-4 py-2">
            <h2 className="font-ui text-[15px] font-semibold">{copy.title}</h2>
            {items.length ? (
              <button type="button" onClick={clear} className="t-note min-h-11 px-2 text-fg-soft underline-offset-4 hover:text-fg hover:underline">
                {copy.clear}
              </button>
            ) : null}
          </div>
          <ul className="max-h-[min(70svh,460px)] divide-y divide-rule overflow-y-auto">
            {seenSoon || soon ? (
              initial.soon.map((session) => (
                <li key={`soon-${session.id}`}>
                  <Popover.Close asChild>
                    <Link href="/dashboard" className="flex gap-3 bg-[color-mix(in_oklch,var(--champagne),transparent_55%)] px-4 py-3">
                      <CalendarClock aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-label" />
                      <span className="min-w-0">
                        <span className="block font-ui text-[14px] font-semibold">{copy.sessionSoon(session.when)}</span>
                        <span className="t-note block truncate text-fg-soft">{session.title}</span>
                      </span>
                    </Link>
                  </Popover.Close>
                </li>
              ))
            ) : null}
            {items.map((item) => {
              const Icon = ICONS[item.kind] ?? Megaphone;
              const content = (
                <>
                  <Icon aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-label" />
                  <span className="min-w-0 flex-1">
                    <span className="block font-ui text-[14px] font-semibold">{item.title}</span>
                    {item.body ? <span className="t-note line-clamp-2 block text-fg-soft">{item.body}</span> : null}
                    <span className="t-note block text-fg-soft" suppressHydrationWarning>
                      {formatDateTime(item.created_at)}
                    </span>
                  </span>
                  {!item.read_at ? (
                    <>
                      <span aria-hidden="true" className="mt-1.5 size-2 shrink-0 rounded-full bg-red" />
                      <span className="sr-only">{copy.unread}</span>
                    </>
                  ) : null}
                </>
              );
              return (
                <li key={item.id}>
                  {item.link ? (
                    <Popover.Close asChild>
                      <Link href={item.link} className="flex gap-3 px-4 py-3 hover:bg-[color-mix(in_oklch,var(--bone),transparent_40%)]">
                        {content}
                      </Link>
                    </Popover.Close>
                  ) : (
                    <div className="flex gap-3 px-4 py-3">{content}</div>
                  )}
                </li>
              );
            })}
            {!items.length && !initial.soon.length ? <li className="t-note px-4 py-8 text-center text-fg-soft">{copy.empty}</li> : null}
          </ul>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
