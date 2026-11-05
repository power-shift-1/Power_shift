"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { memberClient } from "@/lib/auth";
import { fail, ok, type FormState } from "@/lib/form-state";
import { account, auth } from "@/lib/members-content";
import { publicSupabaseEnv } from "@/lib/supabase/env";

const nameSchema = z
  .string()
  .trim()
  .min(1, auth.errors.name)
  .max(120, auth.errors.name)
  .refine((name) => !/[\p{Cc}\p{Zl}\p{Zp}]/u.test(name), auth.errors.name);

// Line breaks are welcome in a bio; other control characters are not.
const bioSchema = z
  .string()
  .trim()
  .max(500, "Please keep your bio under 500 characters.")
  .transform((bio) => bio.replace(/\r\n?/g, "\n").replace(/[^\P{Cc}\n]/gu, ""));

export async function updateProfile(_previous: FormState, formData: FormData): Promise<FormState> {
  const session = await memberClient();
  if (!session) return fail(auth.errors.generic);

  const name = nameSchema.safeParse(String(formData.get("name") ?? ""));
  if (!name.success) return fail(name.error.issues[0]?.message ?? auth.errors.name);
  const bio = bioSchema.safeParse(String(formData.get("bio") ?? ""));
  if (!bio.success) return fail(bio.error.issues[0]?.message ?? auth.errors.generic);

  const { error } = await session.supabase
    .from("profiles")
    .update({ full_name: name.data, bio: bio.data })
    .eq("id", session.member.id);
  if (error) {
    console.error("[account] Could not save profile:", error.code, error.message);
    return fail(auth.errors.generic);
  }
  revalidatePath("/", "layout");
  return ok(account.saved);
}

/**
 * Saves the address of a picture the browser has just uploaded, or clears it.
 * Only a file in this member's own folder of the public avatars bucket is accepted.
 */
export async function saveAvatar(url: string | null): Promise<{ ok: boolean }> {
  const session = await memberClient();
  const env = publicSupabaseEnv();
  if (!session || !env) return { ok: false };

  const folder = `${env.url.replace(/\/+$/, "")}/storage/v1/object/public/avatars/${session.member.id}/`;
  if (url !== null && !(url.startsWith(folder) && /^[\w.-]+$/.test(url.slice(folder.length)) && url.length <= 2048)) {
    return { ok: false };
  }

  const { error } = await session.supabase.from("profiles").update({ avatar_url: url }).eq("id", session.member.id);
  if (error) console.error("[account] Could not save photo:", error.code, error.message);
  revalidatePath("/", "layout");
  return { ok: !error };
}
