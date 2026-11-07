import { NextResponse, type NextRequest } from "next/server";

import { getCurrentMember } from "@/lib/auth";
import { createUserClient } from "@/lib/supabase/server";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
// Signed at the click, so a lesson page left open for hours still downloads.
const SIGNED_URL_SECONDS = 60;
const NO_STORE = { "Cache-Control": "no-store" };

/**
 * Opens a lesson resource: a file through a short-lived signed link, or the resource's own link.
 * Row level security returns the resource only to members who may watch its lesson, and the storage
 * policy signs the file only for them.
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const member = await getCurrentMember();
  if (!member) {
    const signIn = new URL("/sign-in", request.url);
    signIn.searchParams.set("next", request.nextUrl.searchParams.get("from") ?? "/courses");
    return NextResponse.redirect(signIn, { headers: NO_STORE });
  }
  if (!UUID.test(id)) return new Response("Not found", { status: 404, headers: NO_STORE });

  const supabase = (await createUserClient())!;
  const { data: resource } = await supabase.from("lesson_resources").select("kind, url, storage_path").eq("id", id).maybeSingle();
  if (!resource) return new Response("Not found", { status: 404, headers: NO_STORE });

  if (resource.kind === "link" && resource.url) return NextResponse.redirect(resource.url, { status: 303, headers: NO_STORE });

  const { data: signed, error } = await supabase.storage
    .from("lesson-resources")
    .createSignedUrl(resource.storage_path as string, SIGNED_URL_SECONDS, { download: true });
  if (error || !signed?.signedUrl) {
    console.error("[resources] Could not sign a lesson file:", error?.message);
    return new Response("This file can't be opened right now. Please try again shortly.", { status: 502, headers: NO_STORE });
  }
  return NextResponse.redirect(signed.signedUrl, { status: 303, headers: NO_STORE });
}
