import "server-only";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { connection } from "next/server";

import { publicSupabaseEnv } from "./env";

/**
 * A Supabase client that acts as the signed-in visitor, so row level security decides what it sees.
 * Null while the members area is not configured.
 */
export async function createUserClient() {
  const env = publicSupabaseEnv();
  if (!env) return null;

  // Supabase compares the session's expiry with the current time. Waiting for the real request keeps
  // that out of prefetches, where Next refuses Date.now() because the result would be frozen into the page.
  await connection();
  const store = await cookies();
  return createServerClient(env.url, env.key, {
    cookies: {
      getAll: () => store.getAll(),
      setAll: (list) => {
        try {
          for (const { name, value, options } of list) store.set(name, value, options);
        } catch {
          // Server Components cannot set cookies. The proxy refreshes the session before they render.
        }
      },
    },
  });
}
