"use client";

import { cn } from "cn";
import { Lock, Pin, Timer, VolumeX, X } from "lucide-react";
import { useCallback, useEffect, useLayoutEffect, useRef, useState, useTransition, type FormEvent, type KeyboardEvent } from "react";

import { catchUp, loadOlder, muteMember, postMessage, removeMessage, setPinned } from "@/app/(app)/chat/actions";
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
  for (const message of incoming) byId.set(message.id, { ...byId.get(message.id), ...message });
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
  const [mutedUntil, setMutedUntil] = useState(room.mutedUntil);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [announcement, setAnnouncement] = useState("");
  const [sending, startSending] = useTransition();
  const [loading, startLoading] = useTransition();
  const list = useRef<HTMLOListElement>(null);
  const composer = useRef<HTMLTextAreaElement>(null);
  const stickToBottom = useRef(true);
  const keepOffset = useRef<number | null>(null);
  const newestId = useRef(initial.at(-1)?.id ?? 0);
  const pinnedNow = useRef(initialPinned);

  useEffect(() => {
    newestId.current = messages.at(-1)?.id ?? newestId.current;
  }, [messages]);
  useEffect(() => {
    pinnedNow.current = pinned;
  }, [pinned]);

  // A timed mute ends on its own, so the composer comes back without a reload.
  useEffect(() => {
    if (!mutedUntil) return;
    const timer = setTimeout(() => setMutedUntil(undefined), Math.max(0, Date.parse(mutedUntil) - Date.now()) + 1000);
    return () => clearTimeout(timer);
  }, [mutedUntil]);

  const muted = mutedUntil !== undefined;
  const blocked = isBanned
    ? community.banned
    : muted
      ? community.muted(mutedUntil ? formatDateTime(mutedUntil) : null)
      : room.isLocked && !isAdmin
        ? community.roomLocked
        : null;

  // Realtime doesn't replay what happened while the room was hidden or offline, so every (re)join catches up.
  const sync = useCallback(async () => {
    const missed = await catchUp(room.id, newestId.current);
    if (!missed) return;
    setMessages((current) => merge(current, missed.messages));
    setPinnedList(missed.pinned);
  }, [room.id]);

  // Only a full pinned bar can have older pins waiting behind it.
  const refillIfNeeded = useCallback(
    (id: number) => {
      const current = pinnedNow.current;
      if (current.length === PINNED_LIMIT && current.some((item) => item.id === id)) void sync();
    },
    [sync],
  );

  // Realtime only delivers rows this member may read: new messages, pins, and removals.
  useEffect(() => {
    const supabase = getBrowserClient();
    if (!supabase) return;
    const filter = `room_id=eq.${room.id}`;
    const channel = supabase
      .channel(`room:${room.id}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "chat_messages", filter }, (payload) => {
        const message = payload.new as ChatMessage;
        setMessages((current) => merge(current, [message]));
        if (message.user_id !== me) setAnnouncement(community.newMessage(message.author_name));
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "chat_messages", filter }, (payload) => {
        // Merged, not replaced: an update may leave out columns it didn't change.
        const changes = payload.new as Partial<ChatMessage> & { id: number };
        if (changes.pinned_at === null) refillIfNeeded(changes.id);
        setMessages((current) => current.map((message) => (message.id === changes.id ? { ...message, ...changes } : message)));
        setPinnedList((current) => {
          const known = current.find((item) => item.id === changes.id);
          if (known) return withPin(current, { ...known, ...changes });
          // A newly pinned message: its full row is complete enough to show when it arrives with a body.
          return changes.pinned_at && changes.body ? withPin(current, changes as ChatMessage) : current;
        });
      })
      // Deletes can't be filtered by room, so every removal arrives and only matching ids drop out.
      .on("postgres_changes", { event: "DELETE", schema: "public", table: "chat_messages" }, (payload) => {
        const id = (payload.old as { id?: number }).id;
        if (typeof id !== "number") return;
        refillIfNeeded(id);
        setMessages((current) => current.filter((message) => message.id !== id));
        setPinnedList((current) => current.filter((message) => message.id !== id));
      })
      .subscribe((state) => {
        setStatus(state === "SUBSCRIBED" ? "live" : state === "CHANNEL_ERROR" || state === "TIMED_OUT" ? "offline" : "connecting");
        if (state === "SUBSCRIBED") void sync();
      });
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [room.id, me, sync, refillIfNeeded]);

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
    setNotice(null);
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
      const more = older.length === MESSAGE_PAGE;
      setHasMore(more);
      setMessages((current) => merge(current, older));
      // The button goes away with the last page, so keep keyboard focus in the conversation.
      if (!more) element.focus();
    });
  }

  function reply(message: ChatMessage) {
    setReplyTo(message);
  }

  function remove(id: number) {
    if (!window.confirm(community.removeConfirm)) return;
    void removeMessage(id).then((result) => {
      if (!result.ok) return setError(community.removeFailed);
      refillIfNeeded(id);
      setMessages((current) => current.filter((message) => message.id !== id));
      setPinnedList((current) => current.filter((message) => message.id !== id));
      // The message's menu went with it, so keep keyboard focus in the conversation.
      list.current?.focus();
    });
  }

  function pin(message: ChatMessage, next: boolean) {
    const before = pinned;
    const wasFull = before.length === PINNED_LIMIT && before.some((item) => item.id === message.id);
    const updated = { ...message, pinned_at: next ? new Date().toISOString() : null };
    setMessages((current) => current.map((item) => (item.id === message.id ? updated : item)));
    setPinnedList((current) => withPin(current, updated));
    void setPinned(message.id, next).then((result) => {
      if (result.ok) {
        // Refill only once the unpin is saved, or the old pin would come straight back.
        if (!next && wasFull) void sync();
        return;
      }
      setMessages((current) => current.map((item) => (item.id === message.id ? message : item)));
      setPinnedList(before);
      setError(community.pinFailed);
    });
  }

  function mute(message: ChatMessage, minutes: number) {
    const option = community.muteOptions.find((item) => item.minutes === minutes);
    void muteMember(room.id, message.user_id, minutes).then((result) =>
      result.ok && option ? setNotice(`${message.author_name}: ${community.muteDone(option.label)}`) : setError(community.muteFailed),
    );
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

      {/* Polite announcements for screen readers: new messages from others, and moderation results. */}
      <p aria-live="polite" className="sr-only">
        {announcement}
      </p>

      {pinned.length ? (
        <ul aria-label={community.pinned} className="divide-y divide-rule border-b border-rule bg-[color-mix(in_oklch,var(--champagne),transparent_60%)]">
          {pinned.map((message) => (
            <li key={message.id}>
              <a href={`#message-${message.id}`} className="flex min-h-11 items-start gap-2 px-4 py-2 font-ui text-[14px]">
                <Pin aria-hidden="true" className="mt-0.5 size-3.5 shrink-0 text-label" />
                <span className="line-clamp-1 min-w-0">
                  <span className="font-semibold">{message.author_name}</span>: <span className="text-fg-soft">{message.body}</span>
                </span>
              </a>
            </li>
          ))}
        </ul>
      ) : null}

      {blocked === null ? (
        <a href="#chat-message" className="sr-only focus:not-sr-only focus:px-4 focus:py-2 focus:font-ui focus:text-[14px] focus:underline">
          {community.skipToComposer}
        </a>
      ) : null}

      <ol
        ref={list}
        tabIndex={-1}
        onScroll={(event) => {
          const element = event.currentTarget;
          stickToBottom.current = element.scrollHeight - element.scrollTop - element.clientHeight < 80;
        }}
        aria-label={community.eyebrow}
        className="flex h-[min(58svh,600px)] flex-col overflow-y-auto px-2 py-3 outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus)] focus-visible:ring-inset sm:px-3"
      >
        {hasMore ? (
          <li className="self-center pb-3">
            <Button type="button" variant="ghost" size="default" onClick={showOlder} disabled={loading} className="min-h-11 font-ui">
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
              onFocusComposer={() => composer.current?.focus()}
              onReport={() => setReporting(message)}
              onPin={(next) => pin(message, next)}
              onMute={(minutes) => mute(message, minutes)}
              onRemove={() => remove(message.id)}
            />
          );
        })}
      </ol>

      {blocked === null ? (
        <form onSubmit={send} className="border-t border-rule p-3">
          {replyTo ? (
            <div className="mb-2 flex items-start justify-between gap-3 border-l-2 border-l-gold-line pl-3">
              <p id="chat-replying" className="line-clamp-2 min-w-0 font-ui text-[13px] text-fg-soft">
                <span className="font-semibold text-fg">{community.replyingTo(replyTo.author_name)}</span>: {replyTo.body}
              </p>
              <button
                type="button"
                onClick={() => {
                  setReplyTo(null);
                  composer.current?.focus();
                }}
                aria-label={community.cancelReply}
                className="grid size-11 shrink-0 place-items-center text-fg-soft hover:text-fg md:size-8"
              >
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
              aria-describedby={replyTo ? "chat-replying" : undefined}
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
        <p className="t-note flex items-center gap-2 border-t border-rule p-4 text-fg-soft" suppressHydrationWarning>
          {muted ? <VolumeX aria-hidden="true" className="size-4 shrink-0" /> : <Lock aria-hidden="true" className="size-4 shrink-0" />}
          {blocked}
        </p>
      )}
      <div aria-live="polite" className="px-4 empty:hidden">
        {error ? (
          <FormMessage tone="error" live={false} className="pb-3">
            {error}
          </FormMessage>
        ) : notice ? (
          <FormMessage tone="ok" live={false} className="pb-3">
            {notice}
          </FormMessage>
        ) : null}
      </div>

      <ReportDialog message={reporting} onClose={() => setReporting(null)} onClosed={() => (composer.current ?? list.current)?.focus()} />
    </div>
  );
}
