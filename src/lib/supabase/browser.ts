import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

import { publicSupabaseEnv } from "./env";

let client: SupabaseClient | undefined;

/** The browser's Supabase client, for live chat. It reads the session from the same cookies as the server. */
export function getBrowserClient() {
  const env = publicSupabaseEnv();
  if (!env) return null;
  client ??= createBrowserClient(env.url, env.key);
  return client;
}
