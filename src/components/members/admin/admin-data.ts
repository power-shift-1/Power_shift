import "server-only";

import type { createUserClient } from "@/lib/supabase/server";

// Reads shared by the admin pages and the CSV exports. Both RPCs answer 42501 to anyone but an admin.

export type UserClient = NonNullable<Awaited<ReturnType<typeof createUserClient>>>;

export type AdminMember = {
  member_id: string;
  email: string | null;
  full_name: string;
  avatar_url: string | null;
  bio: string;
  role: string;
  attended_masterclass: boolean;
  banned_at: string | null;
  joined_at: string;
  last_sign_in_at: string | null;
  total_count: number;
};

export type DayStat = { stat_day: string; signup_count: number; purchase_count: number; sales_paise: number };

// Supabase returns at most 1,000 rows per request by default.
export const PAGE_SIZE = 1000;

// Without generated types supabase-js takes an RPC's result for a single value, and overrideTypes
// refuses to turn that into an array, so these two say what the functions return.

/** Members newest first, matching `search` against name or email. */
export async function listMembers(supabase: UserClient, search: string, pageSize: number, offset: number) {
  const { data, error } = await supabase.rpc("admin_members", { search: escapeLike(search), page_size: pageSize, page_offset: offset });
  return { data: data as AdminMember[] | null, error };
}

/** One row per day in India's time zone, oldest first, ending today. */
export async function dailyStats(supabase: UserClient, days: number) {
  const { data, error } = await supabase.rpc("admin_daily_stats", { days });
  return { data: data as DayStat[] | null, error };
}

/**
 * Every row, a page at a time, until a page comes back empty.
 * That still works if the project's row limit is set lower than PAGE_SIZE.
 */
export async function readEvery<T>(readPage: (offset: number) => Promise<T[]>) {
  const rows: T[] = [];
  for (let page = await readPage(0); page.length; page = await readPage(rows.length)) rows.push(...page);
  return rows;
}

// The search runs through ILIKE, where % and _ are wildcards.
function escapeLike(value: string) {
  return value.replace(/[%_\\]/g, "\\$&");
}
