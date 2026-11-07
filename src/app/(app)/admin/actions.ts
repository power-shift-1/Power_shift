"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { memberClient } from "@/lib/auth";
import { fail, ok, type FormState } from "@/lib/form-state";
import { istInputToIso } from "@/lib/format";
import { getSupabase } from "@/lib/supabase";
import { parseVideoUrl } from "@/lib/video";

// Every action re-checks the session. Row level security enforces the same rule in the database.
async function adminSession() {
  const session = await memberClient();
  return session?.member.isAdmin ? session : null;
}

const DENIED = fail("Only admins can do that. Please sign in again.");
const SAVED = ok("Saved.");

const text = (max: number) => z.string().trim().max(max, `Please keep it under ${max} characters.`);
const required = (max: number, label: string) => text(max).min(1, `Please enter ${label}.`);
const uuid = z.uuid();
const optionalUuid = z.union([z.literal(""), z.uuid()]).transform((value) => value || null);
const httpsUrl = z.union([z.literal(""), z.url({ protocol: /^https$/, error: "Links must start with https://." })]).transform((value) => value || null);
const checkbox = z.preprocess((value) => value === "on" || value === "true", z.boolean());
const sort = z.coerce.number().int().min(-1000).max(1000).catch(0);

function slugify(value: string) {
  return value
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function form(formData: FormData) {
  return Object.fromEntries([...formData.entries()].filter(([key]) => !key.startsWith("$")).map(([key, value]) => [key, String(value)]));
}

function firstIssue(error: z.ZodError) {
  return fail(error.issues[0]?.message ?? "Please check the form.");
}

function dbFailure(context: string, error: { code?: string; message: string }) {
  console.error(`[admin] ${context}:`, error.code, error.message);
  if (error.code === "23505") return fail("That is already taken. Please choose another.");
  if (error.code === "23514") return fail("One of the values isn't allowed. Please check the form.");
  if (error.code === "42501") return DENIED;
  return fail("Could not save. Please try again.");
}

// ------------------------------------------------------------------------------------------------
// Courses
// ------------------------------------------------------------------------------------------------

const courseSchema = z.object({
  title: required(160, "a title"),
  slug: text(80),
  summary: text(2000),
  cover_url: httpsUrl,
  price: z.coerce
    .number({ error: "Please enter a price in rupees." })
    .min(1, "Razorpay's smallest price is ₹1.")
    .max(100000, "Please enter a price up to ₹1,00,000."),
  is_published: checkbox,
  sort,
});

function courseRow(data: z.infer<typeof courseSchema>) {
  const slug = slugify(data.slug || data.title);
  return {
    title: data.title,
    slug,
    summary: data.summary,
    cover_url: data.cover_url,
    price_paise: Math.round(data.price * 100),
    is_published: data.is_published,
    sort: data.sort,
  };
}

export async function createCourse(_previous: FormState, formData: FormData): Promise<FormState> {
  const session = await adminSession();
  if (!session) return DENIED;
  const parsed = courseSchema.safeParse(form(formData));
  if (!parsed.success) return firstIssue(parsed.error);
  const row = courseRow(parsed.data);
  if (!row.slug) return fail("Please give the course a title with some letters or numbers in it.");

  const { data, error } = await session.supabase.from("courses").insert(row).select("id").single();
  if (error) return dbFailure("Create course", error);
  revalidatePath("/", "layout");
  redirect(`/admin/courses/${data.id}`);
}

export async function updateCourse(_previous: FormState, formData: FormData): Promise<FormState> {
  const session = await adminSession();
  if (!session) return DENIED;
  const values = form(formData);
  const id = uuid.safeParse(values.id);
  const parsed = courseSchema.safeParse(values);
  if (!id.success) return fail("That course no longer exists.");
  if (!parsed.success) return firstIssue(parsed.error);

  const { error } = await session.supabase.from("courses").update(courseRow(parsed.data)).eq("id", id.data);
  if (error) return dbFailure("Update course", error);
  revalidatePath("/", "layout");
  return SAVED;
}

export async function deleteCourse(_previous: FormState, formData: FormData): Promise<FormState> {
  const session = await adminSession();
  if (!session) return DENIED;
  const id = uuid.safeParse(formData.get("id"));
  if (!id.success) return fail("That course no longer exists.");

  const files = await resourceFiles(session.supabase, "lessons.course_id", id.data);
  const { error } = await session.supabase.from("courses").delete().eq("id", id.data);
  if (error?.code === "23503") return fail("Someone has bought this course, so it can't be deleted. Unpublish it instead.");
  if (error) return dbFailure("Delete course", error);
  await removeFiles(session.supabase, files);
  revalidatePath("/", "layout");
  redirect("/admin/courses");
}

type Client = NonNullable<Awaited<ReturnType<typeof adminSession>>>["supabase"];

/** Storage paths of the lesson files that a lesson or course deletion is about to orphan. */
async function resourceFiles(supabase: Client, column: "lesson_id" | "lessons.course_id", value: string) {
  const query =
    column === "lesson_id"
      ? supabase.from("lesson_resources").select("storage_path").eq("lesson_id", value)
      : supabase.from("lesson_resources").select("storage_path, lessons!inner(course_id)").eq("lessons.course_id", value);
  const { data } = await query;
  return (data ?? []).flatMap((row) => (row.storage_path ? [row.storage_path as string] : []));
}

/** Rows cascade away with their lesson, but storage files don't, so they're removed here. */
async function removeFiles(supabase: Client, paths: string[]) {
  if (!paths.length) return;
  const { error } = await supabase.storage.from("lesson-resources").remove(paths);
  if (error) console.error("[admin] Could not remove lesson files:", error.message);
}

// ------------------------------------------------------------------------------------------------
// Lessons
// ------------------------------------------------------------------------------------------------

const lessonSchema = z.object({
  id: optionalUuid,
  course_id: uuid,
  title: required(160, "a title"),
  summary: text(2000),
  video_url: text(500),
  is_free: checkbox,
  minutes: z.union([z.literal(""), z.coerce.number().int().min(0).max(1440)]).transform((value) => (value === "" ? null : value * 60)),
  sort,
});

export async function saveLesson(_previous: FormState, formData: FormData): Promise<FormState> {
  const session = await adminSession();
  if (!session) return DENIED;
  const parsed = lessonSchema.safeParse(form(formData));
  if (!parsed.success) return firstIssue(parsed.error);
  const { id, course_id, video_url, minutes, ...rest } = parsed.data;

  // Check the link before saving anything, so a bad paste never leaves a half-saved lesson.
  const video = video_url ? parseVideoUrl(video_url) : null;
  if (video_url && !video) return fail("That isn't a YouTube or Vimeo video link.");

  const row = { ...rest, course_id, duration_s: minutes };
  const saved = id
    ? await session.supabase.from("lessons").update(row).eq("id", id).select("id").single()
    : await session.supabase.from("lessons").insert(row).select("id").single();
  if (saved.error) return dbFailure("Save lesson", saved.error);

  const lessonId = saved.data.id as string;
  const media = video
    ? await session.supabase
        .from("lesson_media")
        .upsert({ lesson_id: lessonId, provider: video.provider, video_id: video.videoId, vimeo_hash: video.vimeoHash })
    : await session.supabase.from("lesson_media").delete().eq("lesson_id", lessonId);
  if (media.error) return dbFailure("Save lesson video", media.error);

  revalidatePath("/", "layout");
  return ok(id ? "Lesson saved." : "Lesson added.");
}

export async function deleteLesson(_previous: FormState, formData: FormData): Promise<FormState> {
  const session = await adminSession();
  if (!session) return DENIED;
  const id = uuid.safeParse(formData.get("id"));
  if (!id.success) return fail("That lesson no longer exists.");
  const files = await resourceFiles(session.supabase, "lesson_id", id.data);
  const { error } = await session.supabase.from("lessons").delete().eq("id", id.data);
  if (error) return dbFailure("Delete lesson", error);
  await removeFiles(session.supabase, files);
  revalidatePath("/", "layout");
  return ok("Lesson deleted.");
}

// ------------------------------------------------------------------------------------------------
// Announcements and live sessions
// ------------------------------------------------------------------------------------------------

export async function createAnnouncement(_previous: FormState, formData: FormData): Promise<FormState> {
  const session = await adminSession();
  if (!session) return DENIED;
  const parsed = z
    .object({ title: required(160, "a title"), body: text(5000), course_id: optionalUuid, publish: checkbox })
    .safeParse(form(formData));
  if (!parsed.success) return firstIssue(parsed.error);
  const { publish, ...row } = parsed.data;

  const { error } = await session.supabase
    .from("announcements")
    .insert({ ...row, published_at: publish ? new Date().toISOString() : null });
  if (error) return dbFailure("Create announcement", error);
  revalidatePath("/", "layout");
  return ok(publish ? "Published." : "Saved as a draft.");
}

export async function setAnnouncementPublished(_previous: FormState, formData: FormData): Promise<FormState> {
  const session = await adminSession();
  if (!session) return DENIED;
  const id = uuid.safeParse(formData.get("id"));
  if (!id.success) return fail("That announcement no longer exists.");
  const publish = formData.get("publish") === "true";

  const { error } = await session.supabase
    .from("announcements")
    .update({ published_at: publish ? new Date().toISOString() : null })
    .eq("id", id.data);
  if (error) return dbFailure("Publish announcement", error);
  revalidatePath("/", "layout");
  return ok(publish ? "Published." : "Moved back to drafts.");
}

export async function deleteAnnouncement(_previous: FormState, formData: FormData): Promise<FormState> {
  const session = await adminSession();
  if (!session) return DENIED;
  const id = uuid.safeParse(formData.get("id"));
  if (!id.success) return fail("That announcement no longer exists.");
  const { error } = await session.supabase.from("announcements").delete().eq("id", id.data);
  if (error) return dbFailure("Delete announcement", error);
  revalidatePath("/", "layout");
  return ok("Deleted.");
}

export async function createSession(_previous: FormState, formData: FormData): Promise<FormState> {
  const session = await adminSession();
  if (!session) return DENIED;
  const parsed = z
    .object({
      title: required(160, "a title"),
      description: text(2000),
      starts_at: z.string().transform((value, ctx) => {
        const iso = istInputToIso(value);
        if (!iso) ctx.addIssue({ code: "custom", message: "Please choose a date and time." });
        return iso ?? "";
      }),
      duration_min: z.coerce.number().int().min(5, "Sessions are at least 5 minutes.").max(600),
      course_id: optionalUuid,
      join_url: httpsUrl,
    })
    .safeParse(form(formData));
  if (!parsed.success) return firstIssue(parsed.error);
  const { join_url, ...row } = parsed.data;

  const { data, error } = await session.supabase.from("live_sessions").insert(row).select("id").single();
  if (error) return dbFailure("Create session", error);
  if (join_url) {
    const link = await session.supabase.from("live_session_links").insert({ session_id: data.id, join_url });
    if (link.error) return dbFailure("Save joining link", link.error);
  }
  revalidatePath("/", "layout");
  return ok("Session scheduled.");
}

export async function deleteSession(_previous: FormState, formData: FormData): Promise<FormState> {
  const session = await adminSession();
  if (!session) return DENIED;
  const id = uuid.safeParse(formData.get("id"));
  if (!id.success) return fail("That session no longer exists.");
  const { error } = await session.supabase.from("live_sessions").delete().eq("id", id.data);
  if (error) return dbFailure("Delete session", error);
  revalidatePath("/", "layout");
  return ok("Deleted.");
}

// ------------------------------------------------------------------------------------------------
// Members and chat
// ------------------------------------------------------------------------------------------------

export async function grantCourse(_previous: FormState, formData: FormData): Promise<FormState> {
  const session = await adminSession();
  if (!session) return DENIED;
  const parsed = z.object({ user_id: uuid, course_id: uuid }).safeParse(form(formData));
  if (!parsed.success) return fail("Please choose a course.");

  const { error } = await session.supabase.from("purchases").insert({ ...parsed.data, source: "admin", amount_paise: 0 });
  if (error?.code === "23505") {
    // One row per member and course: a refunded purchase is turned back on as a hand grant. Clearing the
    // payment ID means a replayed refund webhook for the old payment can't take it away again.
    const { data: restored, error: restoreError } = await session.supabase
      .from("purchases")
      .update({ status: "paid", source: "admin", amount_paise: 0, payment_id: null, order_id: null })
      .eq("user_id", parsed.data.user_id)
      .eq("course_id", parsed.data.course_id)
      .eq("status", "refunded")
      .select("id");
    if (restoreError) return dbFailure("Grant course", restoreError);
    if (!restored?.length) return fail("They already have this course.");
  } else if (error) {
    return dbFailure("Grant course", error);
  }
  revalidatePath("/", "layout");
  return ok("Course added.");
}

/** Blanks a member's name, bio and picture, and deletes their uploaded pictures. */
export async function clearProfile(_previous: FormState, formData: FormData): Promise<FormState> {
  const session = await adminSession();
  if (!session) return DENIED;
  const id = uuid.safeParse(formData.get("user_id"));
  if (!id.success) return fail("That member no longer exists.");

  const { error } = await session.supabase.rpc("admin_clear_profile", { target: id.data });
  if (error) return dbFailure("Clear profile", error);

  // Storage only lets members manage their own folder, so the secret key removes the files.
  const service = getSupabase();
  if (service) {
    const avatars = service.storage.from("avatars");
    const { data: files } = await avatars.list(id.data, { limit: 1000 });
    if (files?.length) await avatars.remove(files.map((file) => `${id.data}/${file.name}`));
  }
  revalidatePath("/", "layout");
  return ok("Name, bio and photo cleared.");
}

/** Only courses the team added by hand. A paid course is taken back by refunding it in Razorpay. */
export async function revokeCourse(_previous: FormState, formData: FormData): Promise<FormState> {
  const session = await adminSession();
  if (!session) return DENIED;
  const id = uuid.safeParse(formData.get("id"));
  if (!id.success) return fail("That purchase no longer exists.");
  const { error } = await session.supabase.from("purchases").delete().eq("id", id.data).eq("source", "admin");
  if (error) return dbFailure("Revoke course", error);
  revalidatePath("/", "layout");
  return ok("Course removed.");
}

export async function setBanned(_previous: FormState, formData: FormData): Promise<FormState> {
  const session = await adminSession();
  if (!session) return DENIED;
  const id = uuid.safeParse(formData.get("user_id"));
  if (!id.success) return fail("That member no longer exists.");
  const banned = formData.get("banned") === "true";

  const { error } = await session.supabase.rpc("admin_set_banned", { target: id.data, banned });
  if (error?.code === "22023") return fail("You can't ban yourself.");
  if (error) return dbFailure("Ban member", error);
  revalidatePath("/", "layout");
  return ok(banned ? "Banned from posting." : "Can post again.");
}

export async function deleteChatMessage(_previous: FormState, formData: FormData): Promise<FormState> {
  const session = await adminSession();
  if (!session) return DENIED;
  const id = z.coerce.number().int().positive().safeParse(formData.get("id"));
  if (!id.success) return fail("That message no longer exists.");
  const { error } = await session.supabase.from("chat_messages").delete().eq("id", id.data);
  if (error) return dbFailure("Remove message", error);
  revalidatePath("/admin", "layout");
  return ok("Removed.");
}

export async function updateRoomSettings(_previous: FormState, formData: FormData): Promise<FormState> {
  const session = await adminSession();
  if (!session) return DENIED;
  const parsed = z
    .object({
      id: uuid,
      topic: text(300),
      is_locked: checkbox,
      slow_mode_seconds: z.coerce.number().int().min(0).max(3600).catch(0),
    })
    .safeParse(form(formData));
  if (!parsed.success) return firstIssue(parsed.error);
  const { id, ...row } = parsed.data;

  const { error } = await session.supabase.from("chat_rooms").update(row).eq("id", id);
  if (error) return dbFailure("Update room", error);
  revalidatePath("/", "layout");
  return SAVED;
}

export async function liftMute(_previous: FormState, formData: FormData): Promise<FormState> {
  const session = await adminSession();
  if (!session) return DENIED;
  const parsed = z.object({ room_id: uuid, user_id: uuid }).safeParse(form(formData));
  if (!parsed.success) return fail("That mute no longer exists.");
  const { error } = await session.supabase
    .from("chat_mutes")
    .delete()
    .eq("room_id", parsed.data.room_id)
    .eq("user_id", parsed.data.user_id);
  if (error) return dbFailure("Lift mute", error);
  revalidatePath("/admin", "layout");
  return ok("Mute lifted.");
}

/** Closes a report as dealt with or not a problem, leaving the message in place. */
export async function closeReport(_previous: FormState, formData: FormData): Promise<FormState> {
  const session = await adminSession();
  if (!session) return DENIED;
  const parsed = z.object({ id: uuid, status: z.enum(["resolved", "dismissed"]) }).safeParse(form(formData));
  if (!parsed.success) return fail("That report no longer exists.");
  const { error } = await session.supabase
    .from("chat_reports")
    .update({ status: parsed.data.status, resolved_at: new Date().toISOString() })
    .eq("id", parsed.data.id);
  if (error) return dbFailure("Close report", error);
  revalidatePath("/admin", "layout");
  return ok(parsed.data.status === "resolved" ? "Marked as dealt with." : "Dismissed.");
}

/** Mutes the author of a reported message in that room and closes every report about it. */
export async function muteReported(_previous: FormState, formData: FormData): Promise<FormState> {
  const session = await adminSession();
  if (!session) return DENIED;
  const parsed = z
    .object({ message_id: z.coerce.number().int().positive(), minutes: z.coerce.number().int().min(0).max(525600) })
    .safeParse(form(formData));
  if (!parsed.success) return fail("That message no longer exists.");

  const { data: message } = await session.supabase
    .from("chat_messages")
    .select("room_id, user_id")
    .eq("id", parsed.data.message_id)
    .maybeSingle();
  if (!message) return fail("That message no longer exists.");
  if (message.user_id === session.member.id) return fail("You can't mute yourself.");

  const minutes = parsed.data.minutes;
  const { error } = await session.supabase.from("chat_mutes").upsert({
    room_id: message.room_id,
    user_id: message.user_id,
    muted_until: minutes ? new Date(Date.now() + minutes * 60_000).toISOString() : null,
  });
  if (error) return dbFailure("Mute member", error);
  await session.supabase
    .from("chat_reports")
    .update({ status: "resolved", resolved_at: new Date().toISOString() })
    .eq("message_id", parsed.data.message_id)
    .eq("status", "open");
  revalidatePath("/admin", "layout");
  return ok("Muted in that room.");
}

// ------------------------------------------------------------------------------------------------
// Lesson resources
// ------------------------------------------------------------------------------------------------

export async function addLinkResource(_previous: FormState, formData: FormData): Promise<FormState> {
  const session = await adminSession();
  if (!session) return DENIED;
  const parsed = z
    .object({
      lesson_id: uuid,
      title: required(160, "a title"),
      url: z.url({ protocol: /^https$/, error: "Links must start with https://." }),
      sort,
    })
    .safeParse(form(formData));
  if (!parsed.success) return firstIssue(parsed.error);

  const { error } = await session.supabase.from("lesson_resources").insert({ ...parsed.data, kind: "link" });
  if (error) return dbFailure("Add link", error);
  revalidatePath("/", "layout");
  return ok("Link added.");
}

/** Records a file the admin's browser has just uploaded into lesson-resources/<lesson id>/. */
export async function addFileResource(input: { lessonId: string; title: string; path: string; size: number }): Promise<FormState> {
  const session = await adminSession();
  if (!session) return DENIED;
  const lesson = uuid.safeParse(input.lessonId);
  const title = required(160, "a title").safeParse(input.title);
  if (!lesson.success) return fail("That lesson no longer exists.");
  if (!title.success) return firstIssue(title.error);
  // Only a path inside this lesson's folder, as the uploader builds it.
  if (!new RegExp(`^${lesson.data}/[A-Za-z0-9._-]{1,200}$`).test(input.path)) return fail("That file path isn't allowed.");

  const { error } = await session.supabase.from("lesson_resources").insert({
    lesson_id: lesson.data,
    title: title.data,
    kind: "file",
    storage_path: input.path,
    size_bytes: Number.isSafeInteger(input.size) && input.size >= 0 ? input.size : null,
  });
  if (error) return dbFailure("Add file", error);
  revalidatePath("/", "layout");
  return ok("File added.");
}

export async function deleteResource(_previous: FormState, formData: FormData): Promise<FormState> {
  const session = await adminSession();
  if (!session) return DENIED;
  const id = uuid.safeParse(formData.get("id"));
  if (!id.success) return fail("That resource no longer exists.");

  const { data: resource } = await session.supabase.from("lesson_resources").select("storage_path").eq("id", id.data).maybeSingle();
  const { error } = await session.supabase.from("lesson_resources").delete().eq("id", id.data);
  if (error) return dbFailure("Delete resource", error);
  // The file goes too, so storage doesn't fill up with orphans.
  if (resource?.storage_path) await session.supabase.storage.from("lesson-resources").remove([resource.storage_path]);
  revalidatePath("/", "layout");
  return ok("Resource deleted.");
}
