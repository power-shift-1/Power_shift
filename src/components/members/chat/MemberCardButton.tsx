"use client";

import { Popover } from "radix-ui";
import { useState } from "react";

import { getMemberCard } from "@/app/(app)/chat/actions";
import { Avatar } from "@/components/members/Avatar";
import type { MemberCard } from "@/lib/chat";
import { community } from "@/lib/members-content";

/** The author's name, opening their card (picture, name and bio) on demand. */
export function MemberCardButton({ userId, name, avatar }: { userId: string; name: string; avatar: string | null }) {
  const [card, setCard] = useState<MemberCard | null | undefined>(undefined);

  return (
    <Popover.Root
      onOpenChange={(open) => {
        if (open && card === undefined) void getMemberCard(userId).then(setCard);
      }}
    >
      <Popover.Trigger className="font-semibold underline-offset-4 hover:underline focus-visible:underline">{name}</Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          align="start"
          sideOffset={6}
          collisionPadding={12}
          data-stock="paper"
          className="z-50 w-72 border border-rule p-4 shadow-[0_12px_32px_rgb(14_15_18/.16)] outline-none"
        >
          <div className="flex items-center gap-3">
            <Avatar name={card?.full_name || name} src={card?.avatar_url ?? avatar} size={48} />
            <p className="font-ui text-[16px] font-semibold">{card?.full_name || name}</p>
          </div>
          <p className="t-eyebrow mt-4">{community.memberCard}</p>
          <p className="mt-1 font-ui text-[14px] leading-[1.55] whitespace-pre-line text-fg-soft">
            {card === undefined ? "…" : card?.bio || community.noBio}
          </p>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
