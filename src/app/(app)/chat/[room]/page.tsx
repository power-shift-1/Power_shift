import { Lock } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { ChatRoom } from "@/components/members/ChatRoom";
import { Arrow } from "@/components/shared/Arrow";
import { Button } from "@/components/ui/button";
import { requireMember } from "@/lib/auth";
import { MESSAGE_FIELDS, MESSAGE_PAGE, PINNED_LIMIT, type ChatMessage, type RoomState } from "@/lib/chat";
import { community, courses as courseCopy } from "@/lib/members-content";
import { createUserClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Community · The Power Shift" };

type Props = { params: Promise<{ room: string }> };
type Room = {
  id: string;
  name: string;
  course_id: string | null;
  topic: string;
  is_locked: boolean;
  slow_mode_seconds: number;
  courses: { slug: string; is_published: boolean } | null;
};

function activeMute(mute: { muted_until: string | null } | null) {
  if (!mute) return undefined;
  return mute.muted_until === null || Date.parse(mute.muted_until) > Date.now() ? mute.muted_until : undefined;
}

export default async function ChatRoomPage({ params }: Props) {
  const { room: slug } = await params;
  const member = await requireMember(`/chat/${slug}`);
  const supabase = (await createUserClient())!;
  if (!/^[a-z0-9-]{1,80}$/.test(slug)) notFound();

  const { data: room } = await supabase
    .from("chat_rooms")
    .select("id, name, course_id, topic, is_locked, slow_mode_seconds, courses(slug, is_published)")
    .eq("slug", slug)
    .maybeSingle()
    .overrideTypes<Room, { merge: false }>();
  if (!room || (room.course_id && !room.courses?.is_published && !member.isAdmin)) notFound();

  const name = room.course_id ? room.name : community.lounge;
  const { data: canAccess } = await supabase.rpc("can_access_room", { target: room.id });

  if (!canAccess) {
    return (
      <div className="mx-auto flex max-w-xl flex-col items-start gap-5 py-10">
        <Lock aria-hidden="true" className="size-8 text-gold-line" />
        <h1 className="font-display text-[2.5rem] leading-[1.1]">{name}</h1>
        <p className="t-body text-fg-soft">{community.lockedTitle}</p>
        <Button asChild variant="reserve" size="default">
          <Link href={room.courses ? `/courses/${room.courses.slug}` : "/courses"}>
            <span>{courseCopy.eyebrow}</span>
            <Arrow />
          </Link>
        </Button>
      </div>
    );
  }

  const [{ data }, { data: pinned }, { data: mute }] = await Promise.all([
    supabase
      .from("chat_messages")
      .select(MESSAGE_FIELDS)
      .eq("room_id", room.id)
      .order("id", { ascending: false })
      .limit(MESSAGE_PAGE)
      .overrideTypes<ChatMessage[], { merge: false }>(),
    supabase
      .from("chat_messages")
      .select(MESSAGE_FIELDS)
      .eq("room_id", room.id)
      .not("pinned_at", "is", null)
      .order("pinned_at", { ascending: false })
      .limit(PINNED_LIMIT)
      .overrideTypes<ChatMessage[], { merge: false }>(),
    supabase.from("chat_mutes").select("muted_until").eq("room_id", room.id).eq("user_id", member.id).maybeSingle(),
  ]);
  const initial = (data ?? []).reverse();
  const state: RoomState = {
    id: room.id,
    topic: room.topic,
    isLocked: room.is_locked,
    slowModeSeconds: room.slow_mode_seconds,
    mutedUntil: activeMute(mute),
  };

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href="/chat" className="t-note text-fg-soft hover:text-fg">
          ← {community.eyebrow}
        </Link>
        <h1 className="mt-3 font-display text-[length:clamp(2rem,1.5rem+1.8vw,3rem)] leading-[1.1]">{name}</h1>
        {room.topic ? <p className="t-body mt-2 text-fg-soft">{room.topic}</p> : null}
      </div>
      {/* Keyed so a page Next keeps alive in the background never shows another room's or another member's state. */}
      <ChatRoom
        key={`${room.id}:${member.id}`}
        room={state}
        initial={initial}
        initialPinned={pinned ?? []}
        hasMore={initial.length === MESSAGE_PAGE}
        me={member.id}
        isAdmin={member.isAdmin}
        isBanned={member.isBanned}
      />
    </div>
  );
}
