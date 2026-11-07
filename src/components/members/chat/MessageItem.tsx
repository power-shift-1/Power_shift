"use client";

import { cn } from "cn";
import { BadgeCheck, CornerUpLeft, Ellipsis, Flag, Pin, PinOff, Trash2, VolumeX } from "lucide-react";
import { DropdownMenu } from "radix-ui";
import { useRef } from "react";

import { Avatar } from "@/components/members/Avatar";
import type { ChatMessage } from "@/lib/chat";
import { formatDate, formatTime } from "@/lib/format";
import { community } from "@/lib/members-content";

import { MemberCardButton } from "./MemberCardButton";

type Props = {
  message: ChatMessage;
  grouped: boolean;
  newDay: boolean;
  mine: boolean;
  isAdmin: boolean;
  canReply: boolean;
  onReply: () => void;
  onFocusComposer: () => void;
  onReport: () => void;
  onPin: (pinned: boolean) => void;
  onMute: (minutes: number) => void;
  onRemove: () => void;
};

const ITEM = "flex min-h-11 cursor-pointer items-center gap-2 px-3 font-ui text-[14px] outline-none data-[highlighted]:bg-[color-mix(in_oklch,var(--bone),transparent_30%)] md:min-h-10";
const MENU = "z-50 min-w-48 border border-rule py-1 shadow-[0_12px_32px_rgb(14_15_18/.16)]";

/** A small mark the database sets from the author's role, so it can't be copied by changing a name. */
function TeamBadge() {
  return (
    <span title={community.teamHint} className="ml-2 inline-flex items-center gap-1 align-middle font-ui text-[12px] font-semibold text-t-royal">
      <BadgeCheck aria-hidden="true" className="size-3.5" />
      {community.team}
    </span>
  );
}

export function MessageItem({ message, grouped, newDay, mine, isAdmin, canReply, onReply, onFocusComposer, onReport, onPin, onMute, onRemove }: Props) {
  const compact = grouped && !newDay;
  // Radix hands focus back to the ⋯ button when the menu closes; after Reply it should land in the composer.
  const replying = useRef(false);
  const hasActions = canReply || !mine || isAdmin;

  return (
    <li id={`message-${message.id}`} className="group scroll-mt-24">
      {newDay ? (
        <p className="t-note my-3 text-center text-fg-soft" suppressHydrationWarning>
          {formatDate(message.created_at)}
        </p>
      ) : null}
      {/* Grouped messages indent by the avatar's width plus its gap, so their text lines up with the first. */}
      <div className={cn("relative flex gap-3 rounded-sm px-2 py-1 transition-colors hover:bg-[color-mix(in_oklch,var(--bone),transparent_55%)]", compact ? "pl-[56px]" : "mt-2")}>
        {compact ? null : <Avatar name={message.author_name} src={message.author_avatar} size={36} />}
        <div className="min-w-0 flex-1">
          {compact ? null : (
            <p className="font-ui text-[14px]">
              <MemberCardButton userId={message.user_id} name={message.author_name} avatar={message.author_avatar} />
              {message.author_is_admin ? <TeamBadge /> : null}
              {mine ? <span className="text-fg-soft"> (you)</span> : null}
              <time className="ml-2 text-fg-soft" dateTime={message.created_at} suppressHydrationWarning>
                {formatTime(message.created_at)}
              </time>
              {message.pinned_at ? (
                <span className="ml-2 inline-flex items-center gap-1 text-label">
                  <Pin aria-hidden="true" className="size-3" />
                  {community.pinned}
                </span>
              ) : null}
            </p>
          )}
          {message.reply_to && message.reply_author ? (
            <a
              href={`#message-${message.reply_to}`}
              className="mt-1 mb-1 line-clamp-1 border-l-2 border-l-gold-line pl-3 font-ui text-[13px] text-fg-soft hover:text-fg"
            >
              <span className="font-semibold">{message.reply_author}</span>: {message.reply_excerpt}
            </a>
          ) : null}
          <p className="font-ui text-[16px] leading-[1.5] break-words whitespace-pre-wrap">{message.body}</p>
        </div>

        {hasActions ? (
          <DropdownMenu.Root modal={false}>
            <DropdownMenu.Trigger
              aria-label={community.moreActions(message.author_name)}
              className="grid size-11 shrink-0 place-items-center self-start text-fg-soft opacity-70 transition-opacity hover:text-fg group-hover:opacity-100 focus-visible:opacity-100 data-[state=open]:opacity-100 md:size-9 md:opacity-50"
            >
              <Ellipsis aria-hidden="true" className="size-4" />
            </DropdownMenu.Trigger>
            <DropdownMenu.Portal>
              <DropdownMenu.Content
                align="end"
                sideOffset={4}
                collisionPadding={12}
                data-stock="paper"
                className={MENU}
                onCloseAutoFocus={(event) => {
                  if (!replying.current) return;
                  replying.current = false;
                  event.preventDefault();
                  onFocusComposer();
                }}
              >
                {canReply ? (
                  <DropdownMenu.Item
                    className={ITEM}
                    onSelect={() => {
                      replying.current = true;
                      onReply();
                    }}
                  >
                    <CornerUpLeft aria-hidden="true" className="size-4" />
                    {community.reply}
                  </DropdownMenu.Item>
                ) : null}
                {mine ? null : (
                  <DropdownMenu.Item className={ITEM} onSelect={onReport}>
                    <Flag aria-hidden="true" className="size-4" />
                    {community.report}
                  </DropdownMenu.Item>
                )}
                {isAdmin ? (
                  <>
                    <DropdownMenu.Separator className="my-1 h-px bg-rule" />
                    <DropdownMenu.Item className={ITEM} onSelect={() => onPin(!message.pinned_at)}>
                      {message.pinned_at ? <PinOff aria-hidden="true" className="size-4" /> : <Pin aria-hidden="true" className="size-4" />}
                      {message.pinned_at ? community.unpin : community.pin}
                    </DropdownMenu.Item>
                    {mine ? null : (
                      <DropdownMenu.Sub>
                        <DropdownMenu.SubTrigger className={ITEM}>
                          <VolumeX aria-hidden="true" className="size-4" />
                          {community.mute}
                        </DropdownMenu.SubTrigger>
                        <DropdownMenu.Portal>
                          <DropdownMenu.SubContent sideOffset={4} collisionPadding={12} data-stock="paper" className={MENU}>
                            {community.muteOptions.map((option) => (
                              <DropdownMenu.Item key={option.minutes} className={ITEM} onSelect={() => onMute(option.minutes)}>
                                {option.label}
                              </DropdownMenu.Item>
                            ))}
                          </DropdownMenu.SubContent>
                        </DropdownMenu.Portal>
                      </DropdownMenu.Sub>
                    )}
                    <DropdownMenu.Item className={cn(ITEM, "text-red")} onSelect={onRemove}>
                      <Trash2 aria-hidden="true" className="size-4" />
                      {community.remove}
                    </DropdownMenu.Item>
                  </>
                ) : null}
              </DropdownMenu.Content>
            </DropdownMenu.Portal>
          </DropdownMenu.Root>
        ) : null}
      </div>
    </li>
  );
}
