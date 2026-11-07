import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

// Row level security limits lesson_progress to the signed-in member's own rows, so no user filter is needed.

/** Which of these lessons the member has finished. */
export async function completedLessonIds(supabase: SupabaseClient, lessonIds: string[]) {
  if (!lessonIds.length) return new Set<string>();
  const { data } = await supabase
    .from("lesson_progress")
    .select("lesson_id")
    .in("lesson_id", lessonIds)
    .not("completed_at", "is", null);
  return new Set((data ?? []).map((row) => row.lesson_id as string));
}

/** Finished lessons per course, for course cards and the dashboard. */
export async function completedByCourse(supabase: SupabaseClient) {
  const { data } = await supabase
    .from("lesson_progress")
    .select("lessons(course_id)")
    .not("completed_at", "is", null)
    .overrideTypes<{ lessons: { course_id: string } | null }[], { merge: false }>();
  const counts = new Map<string, number>();
  for (const row of data ?? []) {
    if (row.lessons) counts.set(row.lessons.course_id, (counts.get(row.lessons.course_id) ?? 0) + 1);
  }
  return counts;
}

type OutlineLesson = { id: string; title: string; is_free: boolean; courses: { slug: string; title: string; cover_url: string | null } };

/** The first lesson in a course's order that the member hasn't finished and may watch, if any. */
export async function nextLesson(supabase: SupabaseClient, courseSlug: string, owns: boolean) {
  const { data } = await supabase
    .from("lessons")
    .select("id, title, is_free, sort, courses!inner(slug, title, cover_url)")
    .eq("courses.slug", courseSlug)
    .order("sort")
    .overrideTypes<OutlineLesson[], { merge: false }>();
  const lessons = data ?? [];
  const done = await completedLessonIds(supabase, lessons.map((lesson) => lesson.id));
  return lessons.find((lesson) => !done.has(lesson.id) && (owns || lesson.is_free)) ?? null;
}

export function share(done: number, total: number) {
  return total ? Math.min(1, done / total) : 0;
}
