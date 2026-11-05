"use server";

import { memberClient } from "@/lib/auth";

// Row level security limits every one of these to the member's own notifications.

export async function markNotificationsRead(ids?: number[]): Promise<{ ok: boolean }> {
  const session = await memberClient();
  if (!session) return { ok: false };
  let query = session.supabase.from("notifications").update({ read_at: new Date().toISOString() }).is("read_at", null);
  if (ids) {
    const valid = ids.filter((id) => Number.isSafeInteger(id) && id > 0).slice(0, 100);
    if (!valid.length) return { ok: true };
    query = query.in("id", valid);
  }
  const { error } = await query;
  if (error) console.error("[notifications] Could not mark read:", error.code, error.message);
  return { ok: !error };
}

export async function clearNotifications(): Promise<{ ok: boolean }> {
  const session = await memberClient();
  if (!session) return { ok: false };
  const { error } = await session.supabase.from("notifications").delete().eq("user_id", session.member.id);
  if (error) console.error("[notifications] Could not clear:", error.code, error.message);
  return { ok: !error };
}
