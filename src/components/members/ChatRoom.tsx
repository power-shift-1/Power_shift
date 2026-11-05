"use client";

import { cn } from "cn";
import { Lock, Pin, Timer, VolumeX, X } from "lucide-react";
import { useEffect, useLayoutEffect, useRef, useState, useTransition, type FormEvent, type KeyboardEvent } from "react";

import { loadOlder, muteMember, postMessage, removeMessage, setPinned } from "@/app/(app)/chat/actions";
import { Button } from "@/components/ui/button";
import { MESSAGE_PAGE, PINNED_LIMIT, type ChatMessage, type RoomState } from "@/lib/chat";
import { formatDate, formatDateTime } from "@/lib/format";
import { community } from "@/lib/members-content";
import { getBrowserClient } from "@/lib/supabase/browser";

import { MessageItem } from "./chat/MessageItem";
import { ReportDialog } from "./chat/ReportDialog";
import { FormMessage } from "./FormMessage";

type Props = {
  room: RoomState;
  initial: ChatMessage[];
  initialPinned: ChatMessage[];
  hasMore: boolean;
  me: string;
  isAdmin: boolean;
  isBanned: boolean;
};

type Status = "connecting" | "live" | "offline";

function merge(current: ChatMessage[], incoming: ChatMessage[]) {
  const byId = new Map(current.map((message) => [message.id, message]));
  for (const message of incoming) byId.set(message.id, message);
  return [...byId.values()].sort((a, b) => a.id - b.id);
}

function withPin(pinned: ChatMessage[], message: ChatMessage) {
  const rest = pinned.filter((item) => item.id !== message.id);
  return message.pinned_at ? [message, ...rest].sort((a, b) => Date.parse(b.pinned_at!) - Date.parse(a.pinned_at!)).slice(0, PINNED_LIMIT) : rest;
}

export function ChatRoom({ room, initial, initialPinned, hasMore: initialHasMore, me, isAdmin, isBanned }: Props) {
  const [messages, setMessages] = useState(initial);
  const [pinned, setPinnedList] = useState(initialPinned);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [status, setStatus] = useState<Status>("connecting");
  const [draft, setDraft] = useState("");
  const [replyTo, setReplyTo] = useState<ChatMessage | null>(null);
  const [reporting, setReporting] = useState<ChatMessage | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sending, startSending] = useTransition();
  const [loading, startLoading] = useTransition();
  const list = useRef<HTMLOListElement>(null);
  const composer = useRef<HTMLTextAreaElement>(null);
  const stickToBottom = useRef(true);
  const keepOffset = useRef<number | null>(null);

  const muted = room.mutedUntil !== undefined;
  const blocked = isBanned ? community.banned : muted ? community.muted(room.mutedUntil ? formatDateTime(room.mutedUntil) : null) : room.isLocked && !isAdmin ? community.roomLocked : null;

  // Realtime only delivers rows this member may read: new messages, pins, and removals.
  useEffect(() => {
    const supabase = getBrowserClient();
    if (!supabase) return;
    const filter = `room_id=eq.${room.id}`;
    const channel = supabase
      .channel(`room:${room.id}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "chat_messages", filter }, (payload) =>
        setMessages((current) => merge(current, [payload.new as ChatMessage])),
      )
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "chat_messages", filter }, (payload) => {
        const updated = payload.new as ChatMessage;
        setMessages((current) => current.map((message) => (message.id === updated.id ? updated : message)));
        setPinnedList((current) => withPin(current, updated));
      })
      // Deletes can't be filtered by room, so every removal arrives and only matching ids drop out.
      .on("postgres_changes", { event: "DELETE", schema: "public", table: "chat_messages" }, (payload) => {
        const id = (payload.old as { id?: number }).id;
        setMessages((current) => current.filter((message) => message.id !== id));
        setPinnedList((current) => current.filter((message) => message.id !== id));
      })
      .subscribe((state) => setStatus(state === "SUBSCRIBED" ? "live" : state === "CHANNEL_ERROR" || state === "TIMED_OUT" ? "offline" : "connecting"));
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [room.id]);

  // Follow new messages only when the reader is already at the bottom, and keep their place when older ones load.
  useLayoutEffect(() => {
    const element = list.current;
    if (!element) return;
    if (keepOffset.current !== null) {
      element.scrollTop = element.scrollHeight - keepOffset.current;
      keepOffset.current = null;
    } else if (stickToBottom.current) {
      element.scrollTop = element.scrollHeight;
    }
  }, [messages]);

  function send(event?: FormEvent) {
    event?.preventDefault();
    const body = draft.trim();
    if (!body || sending) return;
    setError(null);
    startSending(async () => {
      const result = await postMessage(room.id, body, replyTo?.id ?? null);
      if (result.ok) {
        stickToBottom.current = true;
        setDraft("");
        setReplyTo(null);
        setMessages((current) => merge(current, [result.message]));
      } else {
        setError(result.error);
      }
    });
  }

  function onKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) send(event);
    if (event.key === "Escape" && replyTo) setReplyTo(null);
  }

  function showOlder() {
    const element = list.current;
    const oldest = messages[0];
    if (!oldest || !element) return;
    startLoading(async () => {
      const older = await loadOlder(room.id, oldest.id);
      keepOffset.current = element.scrollHeight - element.scrollTop;
      setHasMore(older.length === MESSAGE_PAGE);
      setMessages((current) => merge(current, older));
    });
  }

  function reply(message: ChatMessage) {
    setReplyTo(message);
    composer.current?.focus();
  }

  function remove(id: number) {
    if (!window.confirm(community.removeConfirm)) return;
    void removeMessage(id).then((result) => {
      if (!result.ok) return;
      setMessages((current) => current.filter((message) => message.id !== id));
      setPinnedList((current) => current.filter((message) => message.id !== id));
    });
  }

  function pin(message: ChatMessage, next: boolean) {
    const updated = { ...message, pinned_at: next ? new Date().toISOString() : null };
    setMessages((current) => current.map((item) => (item.id === message.id ? updated : item)));
    setPinnedList((current) => withPin(current, updated));
    void setPinned(message.id, next);
  }

  return (
    <div className="flex flex-col border border-rule">
      <div className="t-note flex flex-wrap items-center justify-between gap-x-4 gap-y-1 border-b border-rule px-4 py-2 text-fg-soft">
        <span className="flex flex-wrap items-center gap-x-4 gap-y-1">
          {room.isLocked ? (
            <span className="inline-flex items-center gap-1">
              <Lock aria-hidden="true" className="size-3.5" />
              {community.roomLocked}
            </span>
          ) : null}
          {room.slowModeSeconds > 0 ? (
            <span className="inline-flex items-center gap-1">
              <Timer aria-hidden="true" className="size-3.5" />
              {community.slowMode(room.slowModeSeconds)}
            </span>
          ) : null}
        </span>
        <span className="ml-auto inline-flex items-center gap-2" aria-live="polite">
          <span className={cn("size-2 rounded-full", status === "live" ? "bg-[#2f8f4e]" : "bg-t-mist")} aria-hidden="true" />
          {status === "live" ? community.live : community.connecting}
        </span>
      </div>

      {pinned.length ? (
        <ul aria-label={community.pinned} className="divide-y divide-rule border-b border-rule bg-[color-mix(in_oklch,var(--champagne),transparent_60%)]">
          {pinned.map((message) => (
            <li key={message.id}>
              <a href={`#message-${message.id}`} className="flex items-start gap-2 px-4 py-2 font-ui text-[14px]">
                <Pin aria-hidden="true" className="mt-0.5 size-3.5 shrink-0 text-label" />
                <span className="min-w-0">
                  <span className="font-semibold">{message.author_name}</span>: <span className="line-clamp-1 text-fg-soft">{message.body}</span>
                </span>
              </a>
            </li>
          ))}
        </ul>
      ) : null}

      <ol
        ref={list}
        onScroll={(event) => {
          const element = event.currentTarget;
          stickToBottom.current = element.scrollHeight - element.scrollTop - element.clientHeight < 80;
        }}
        aria-label={community.eyebrow}
        className="flex h-[min(58svh,600px)] flex-col overflow-y-auto px-2 py-3 sm:px-3"
      >
        {hasMore ? (
          <li className="self-center pb-3">
            <Button type="button" variant="ghost" size="sm" onClick={showOlder} disabled={loading} className="font-ui">
              {community.loadOlder}
            </Button>
          </li>
        ) : null}
        {messages.length === 0 ? <li className="t-note m-auto text-fg-soft">{community.empty}</li> : null}
        {messages.map((message, index) => {
          const previous = messages[index - 1];
          return (
            <MessageItem
              key={message.id}
              message={message}
              grouped={previous?.user_id === message.user_id && Date.parse(message.created_at) - Date.parse(previous.created_at) < 5 * 60_000}
              newDay={!previous || formatDate(previous.created_at) !== formatDate(message.created_at)}
              mine={message.user_id === me}
              isAdmin={isAdmin}
              canReply={blocked === null}
              onReply={() => reply(message)}
              onReport={() => setReporting(message)}
              onPin={(next) => pin(message, next)}
              onMute={(minutes) => void muteMember(room.id, message.user_id, minutes)}
              onRemove={() => remove(message.id)}
            />
          );
        })}
      </ol>

      {blocked === null ? (
        <form onSubmit={send} className="border-t border-rule p-3">
          {replyTo ? (
            <div className="mb-2 flex items-start justify-between gap-3 border-l-2 border-l-gold-line pl-3">
              <p className="min-w-0 font-ui text-[13px] text-fg-soft">
                <span className="font-semibold text-fg">{community.replyingTo(replyTo.author_name)}</span>
                <span className="line-clamp-1">{replyTo.body}</span>
              </p>
              <button type="button" onClick={() => setReplyTo(null)} aria-label={community.cancelReply} className="grid size-8 shrink-0 place-items-center text-fg-soft hover:text-fg">
                <X aria-hidden="true" className="size-4" />
              </button>
            </div>
          ) : null}
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
            <label htmlFor="chat-message" className="sr-only">
              {community.placeholder}
            </label>
            <textarea
              ref={composer}
              id="chat-message"
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={onKeyDown}
              placeholder={community.placeholder}
              maxLength={2000}
              rows={2}
              className="min-h-12 flex-1 resize-none bg-transparent px-2 py-2 font-ui text-[16px] outline-none placeholder:text-fg-soft"
            />
            <Button type="submit" variant="reserve" size="default" disabled={!draft.trim()} aria-busy={sending || undefined} className="min-h-11">
              {sending ? community.sending : community.send}
            </Button>
          </div>
        </form>
      ) : (
        <p className="t-note flex items-center gap-2 border-t border-rule p-4 text-fg-soft">
          {muted ? <VolumeX aria-hidden="true" className="size-4 shrink-0" /> : <Lock aria-hidden="true" className="size-4 shrink-0" />}
          {blocked}
        </p>
      )}
      {error ? (
        <FormMessage tone="error" className="px-4 pb-3">
          {error}
        </FormMessage>
      ) : null}

      <ReportDialog message={reporting} onClose={() => setReporting(null)} />
    </div>
  );
}
