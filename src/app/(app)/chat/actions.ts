"use server";

import { memberClient } from "@/lib/auth";
import { MESSAGE_FIELDS, MESSAGE_PAGE, PINNED_LIMIT, type ChatMessage, type MemberCard } from "@/lib/chat";
import { auth, community } from "@/lib/members-content";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const validId = (id: unknown): id is number => typeof id === "number" && Number.isSafeInteger(id) && id > 0;

export type PostResult = { ok: true; message: ChatMessage } | { ok: false; error: string };

/** Row level security decides who may post where; a trigger limits how fast and applies slow mode. */
export async function postMessage(roomId: string, body: string, replyTo: number | null = null): Promise<PostResult> {
  const session = await memberClient();
  if (!session || !UUID.test(roomId)) return { ok: false, error: community.failed };
  const text = body.trim();
  if (!text || text.length > 2000) return { ok: false, error: community.failed };

  const { data, error } = await session.supabase
    .from("chat_messages")
    .insert({ room_id: roomId, body: text, reply_to: validId(replyTo) ? replyTo : null })
    .select(MESSAGE_FIELDS)
    .single<ChatMessage>();
  if (!error) return { ok: true, message: data };

  if (error.code === "P0001") return { ok: false, error: error.hint === "slow_mode" ? community.slowWait : community.tooFast };
  if (error.code === "42501") return { ok: false, error: await whyRefused(session, roomId) };
  console.error("[chat] Could not post:", error.code, error.message);
  return { ok: false, error: community.failed };
}

/** The policy only says no; this finds the reason to show. */
async function whyRefused(session: NonNullable<Awaited<ReturnType<typeof memberClient>>>, roomId: string) {
  if (session.member.isBanned) return community.banned;
  const [{ data: mute }, { data: room }] = await Promise.all([
    // Admins can read everyone's mutes, so look only at this member's.
    session.supabase.from("chat_mutes").select("muted_until").eq("room_id", roomId).eq("user_id", session.member.id).maybeSingle(),
    session.supabase.from("chat_rooms").select("is_locked").eq("id", roomId).maybeSingle(),
  ]);
  if (mute && (mute.muted_until === null || Date.parse(mute.muted_until) > Date.now())) return community.muted(null);
  if (room?.is_locked) return community.roomLocked;
  return community.lockedTitle;
}

export async function loadOlder(roomId: string, beforeId: number): Promise<ChatMessage[]> {
  const session = await memberClient();
  if (!session || !UUID.test(roomId) || !validId(beforeId)) return [];
  const { data } = await session.supabase
    .from("chat_messages")
    .select(MESSAGE_FIELDS)
    .eq("room_id", roomId)
    .lt("id", beforeId)
    .order("id", { ascending: false })
    .limit(MESSAGE_PAGE)
    .overrideTypes<ChatMessage[], { merge: false }>();
  return (data ?? []).reverse();
}

/**
 * What the room missed while it was away: messages after the newest one shown, and the current pins.
 * Realtime doesn't replay, so the room calls this whenever its channel (re)joins.
 */
export async function catchUp(roomId: string, afterId: number): Promise<{ messages: ChatMessage[]; pinned: ChatMessage[] } | null> {
  const session = await memberClient();
  if (!session || !UUID.test(roomId) || !Number.isSafeInteger(afterId) || afterId < 0) return null;
  const [newer, pinned] = await Promise.all([
    session.supabase
      .from("chat_messages")
      .select(MESSAGE_FIELDS)
      .eq("room_id", roomId)
      .gt("id", afterId)
      .order("id")
      .limit(200)
      .overrideTypes<ChatMessage[], { merge: false }>(),
    session.supabase
      .from("chat_messages")
      .select(MESSAGE_FIELDS)
      .eq("room_id", roomId)
      .not("pinned_at", "is", null)
      .order("pinned_at", { ascending: false })
      .limit(PINNED_LIMIT)
      .overrideTypes<ChatMessage[], { merge: false }>(),
  ]);
  if (newer.error || pinned.error) return null;
  return { messages: newer.data ?? [], pinned: pinned.data ?? [] };
}

/** Admins only: row level security turns anyone else's delete into a no-op. */
export async function removeMessage(id: number): Promise<{ ok: boolean; error?: string }> {
  const session = await memberClient();
  if (!session?.member.isAdmin || !validId(id)) return { ok: false, error: auth.errors.generic };
  const { error } = await session.supabase.from("chat_messages").delete().eq("id", id);
  if (error) console.error("[chat] Could not remove message:", error.code, error.message);
  return { ok: !error };
}

/** Admins only. Members can't update messages at all, and the pin column is the only one admins may change. */
export async function setPinned(id: number, pinned: boolean): Promise<{ ok: boolean }> {
  const session = await memberClient();
  if (!session?.member.isAdmin || !validId(id)) return { ok: false };
  const { error } = await session.supabase
    .from("chat_messages")
    .update({ pinned_at: pinned ? new Date().toISOString() : null })
    .eq("id", id);
  if (error) console.error("[chat] Could not pin:", error.code, error.message);
  return { ok: !error };
}

export async function reportMessage(id: number, reason: string): Promise<{ ok: boolean }> {
  const session = await memberClient();
  if (!session || !validId(id)) return { ok: false };
  const { error } = await session.supabase
    .from("chat_reports")
    .insert({ message_id: id, reason: reason.trim().slice(0, 500).replace(/[^\P{Cc}\n]/gu, "") });
  if (error && error.code !== "23505") console.error("[chat] Could not report:", error.code, error.message);
  return { ok: !error };
}

/** Admins only. Minutes of 0 means until an admin lifts it. */
export async function muteMember(roomId: string, userId: string, minutes: number): Promise<{ ok: boolean }> {
  const session = await memberClient();
  if (!session?.member.isAdmin || !UUID.test(roomId) || !UUID.test(userId) || userId === session.member.id) return { ok: false };
  if (!Number.isInteger(minutes) || minutes < 0 || minutes > 60 * 24 * 365) return { ok: false };
  const { error } = await session.supabase.from("chat_mutes").upsert({
    room_id: roomId,
    user_id: userId,
    muted_until: minutes ? new Date(Date.now() + minutes * 60_000).toISOString() : null,
  });
  if (error) console.error("[chat] Could not mute:", error.code, error.message);
  return { ok: !error };
}

/** Only for someone this member shares a room with; the database function enforces that. */
export async function getMemberCard(userId: string): Promise<MemberCard | null> {
  const session = await memberClient();
  if (!session || !UUID.test(userId)) return null;
  const { data } = await session.supabase.rpc("member_card", { target: userId });
  const card = Array.isArray(data) ? (data[0] as MemberCard | undefined) : undefined;
  return card ?? null;
}
