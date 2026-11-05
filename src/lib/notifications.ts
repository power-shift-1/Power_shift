import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

export type Notice = {
  id: number;
  kind: "announcement" | "reply" | "report";
  title: string;
  body: string;
  link: string | null;
  created_at: string;
  read_at: string | null;
};

export type SoonSession = { id: string; title: string; starts_at: string };

export const NOTICE_FIELDS = "id, kind, title, body, link, created_at, read_at";
const SOON_MS = 24 * 60 * 60_000;
const STARTED_MS = 30 * 60_000;

/** The bell's contents: the latest notifications, the unread count, and sessions starting within a day. */
export async function loadBell(supabase: SupabaseClient) {
  const now = Date.now();
  const [latest, unread, soon] = await Promise.all([
    supabase
      .from("notifications")
      .select(NOTICE_FIELDS)
      .order("created_at", { ascending: false })
      .limit(15)
      .overrideTypes<Notice[], { merge: false }>(),
    supabase.from("notifications").select("id", { count: "exact", head: true }).is("read_at", null),
    supabase
      .from("live_sessions")
      .select("id, title, starts_at")
      .gte("starts_at", new Date(now - STARTED_MS).toISOString())
      .lte("starts_at", new Date(now + SOON_MS).toISOString())
      .order("starts_at")
      .limit(3)
      .overrideTypes<SoonSession[], { merge: false }>(),
  ]);
  return { items: latest.data ?? [], unread: unread.count ?? 0, soon: soon.data ?? [] };
}
