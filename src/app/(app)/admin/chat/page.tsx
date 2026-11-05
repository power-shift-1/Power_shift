import type { Metadata } from "next";
import Link from "next/link";

import { ActionForm } from "@/components/members/ActionForm";
import { AdminFrame } from "@/components/members/admin/AdminFrame";
import { CheckboxField, Field, SelectField } from "@/components/members/Field";
import { Empty, Panel } from "@/components/members/PageIntro";
import { requireAdmin } from "@/lib/auth";
import { formatDateTime } from "@/lib/format";
import { community } from "@/lib/members-content";
import { createUserClient } from "@/lib/supabase/server";

import { deleteChatMessage, liftMute, updateRoomSettings } from "../actions";

export const metadata: Metadata = { title: "Admin · Chat" };

const SLOW_OPTIONS = [
  { value: 0, label: "Off" },
  { value: 10, label: "One message every 10 seconds" },
  { value: 30, label: "Every 30 seconds" },
  { value: 60, label: "Every minute" },
  { value: 300, label: "Every 5 minutes" },
];

type Room = { id: string; slug: string; name: string; course_id: string | null; topic: string; is_locked: boolean; slow_mode_seconds: number };
type Mute = { room_id: string; user_id: string; muted_until: string | null; created_at: string };
type Row = { id: number; author_name: string; body: string; created_at: string; chat_rooms: { name: string; course_id: string | null } | null };

/** Mutes whose end has passed no longer apply, so they're left out of the list. */
function stillActive(mutes: Mute[]) {
  const now = Date.now();
  return mutes.filter((mute) => mute.muted_until === null || Date.parse(mute.muted_until) > now);
}

export default async function AdminChat() {
  await requireAdmin();
  const supabase = (await createUserClient())!;
  const [{ data: rooms }, { data: mutes }, { data: messages }] = await Promise.all([
    supabase.from("chat_rooms").select("id, slug, name, course_id, topic, is_locked, slow_mode_seconds").order("created_at").overrideTypes<Room[], { merge: false }>(),
    supabase.from("chat_mutes").select("room_id, user_id, muted_until, created_at").order("created_at", { ascending: false }).overrideTypes<Mute[], { merge: false }>(),
    supabase
      .from("chat_messages")
      .select("id, author_name, body, created_at, chat_rooms(name, course_id)")
      .order("id", { ascending: false })
      .limit(100)
      .overrideTypes<Row[], { merge: false }>(),
  ]);

  const active = stillActive(mutes ?? []);
  const { data: names } = active.length
    ? await supabase.from("profiles").select("id, full_name").in("id", [...new Set(active.map((mute) => mute.user_id))])
    : { data: [] };
  const nameOf = new Map((names ?? []).map((row) => [row.id as string, (row.full_name as string) || "Member"]));
  const roomName = (room: Pick<Room, "name" | "course_id"> | undefined) => (room ? (room.course_id ? room.name : community.lounge) : "Room");
  const roomById = new Map((rooms ?? []).map((room) => [room.id, room]));

  return (
    <AdminFrame title="Chat" lead="Set each room's topic, make it read-only, or slow it down. Pin, mute or remove from the message's ⋯ menu inside the room.">
      <Panel title="Rooms">
        <ul className="grid gap-6 lg:grid-cols-2">
          {(rooms ?? []).map((room) => (
            <li key={room.id} className="border border-rule p-5">
              <div className="mb-4 flex items-baseline justify-between gap-3">
                <h3 className="font-ui text-[17px] font-semibold">{roomName(room)}</h3>
                <Link href={`/chat/${room.slug}`} className="t-note underline underline-offset-4">
                  Open room
                </Link>
              </div>
              <ActionForm action={updateRoomSettings} submitLabel="Save room" pendingLabel="Saving…">
                <input type="hidden" name="id" value={room.id} />
                <Field id={`topic-${room.id}`} name="topic" label="Topic (shown under the room's name)" maxLength={300} defaultValue={room.topic} />
                <SelectField id={`slow-${room.id}`} name="slow_mode_seconds" label="Slow mode" defaultValue={String(room.slow_mode_seconds)}>
                  {SLOW_OPTIONS.some((option) => option.value === room.slow_mode_seconds) ? null : (
                    <option value={room.slow_mode_seconds}>Every {room.slow_mode_seconds} seconds</option>
                  )}
                  {SLOW_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </SelectField>
                <CheckboxField id={`locked-${room.id}`} name="is_locked" label="Read-only: only admins can post" defaultChecked={room.is_locked} />
              </ActionForm>
            </li>
          ))}
        </ul>
      </Panel>

      <Panel title={`Muted members (${active.length})`}>
        {active.length ? (
          <ul className="divide-y divide-rule border-y border-rule">
            {active.map((mute) => (
              <li key={`${mute.room_id}-${mute.user_id}`} className="flex flex-wrap items-center justify-between gap-3 py-3">
                <p className="font-ui text-[15px]">
                  <span className="font-semibold">{nameOf.get(mute.user_id) ?? "Member"}</span> in {roomName(roomById.get(mute.room_id))}
                  <span className="t-note block text-fg-soft">{mute.muted_until ? `Until ${formatDateTime(mute.muted_until)}` : "Until lifted"}</span>
                </p>
                <ActionForm action={liftMute} submitLabel="Lift" variant="outline">
                  <input type="hidden" name="room_id" value={mute.room_id} />
                  <input type="hidden" name="user_id" value={mute.user_id} />
                </ActionForm>
              </li>
            ))}
          </ul>
        ) : (
          <Empty>Nobody is muted.</Empty>
        )}
      </Panel>

      <Panel title="Latest messages">
        {messages?.length ? (
          <ul className="divide-y divide-rule border-y border-rule">
            {messages.map((message) => (
              <li key={message.id} className="flex flex-wrap items-start justify-between gap-4 py-4">
                <div className="min-w-0 flex-1">
                  <p className="t-note text-fg-soft">
                    <span className="font-semibold text-fg">{message.author_name}</span> · {roomName(message.chat_rooms ?? undefined)} ·{" "}
                    {formatDateTime(message.created_at)}
                  </p>
                  <p className="mt-1 font-ui text-[16px] break-words whitespace-pre-wrap">{message.body}</p>
                </div>
                <ActionForm action={deleteChatMessage} submitLabel={community.remove} variant="ghost" confirm={community.removeConfirm}>
                  <input type="hidden" name="id" value={message.id} />
                </ActionForm>
              </li>
            ))}
          </ul>
        ) : (
          <Empty>No messages yet.</Empty>
        )}
      </Panel>
    </AdminFrame>
  );
}
