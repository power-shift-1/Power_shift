import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

export type CourseDetail = {
  id: string;
  slug: string;
  title: string;
  summary: string;
  cover_url: string | null;
  price_paise: number;
  is_published: boolean;
  lessons: LessonSummary[];
};

export type LessonSummary = {
  id: string;
  title: string;
  summary: string;
  is_free: boolean;
  duration_s: number | null;
  sort: number;
};

/** A course with its outline, plus whether this member may watch every lesson. Null if it isn't visible to them. */
export async function loadCourse(supabase: SupabaseClient, slug: string) {
  if (!/^[a-z0-9-]{1,80}$/.test(slug)) return null;
  const { data: course } = await supabase
    .from("courses")
    .select("id, slug, title, summary, cover_url, price_paise, is_published, lessons(id, title, summary, is_free, duration_s, sort)")
    .eq("slug", slug)
    .maybeSingle()
    .overrideTypes<CourseDetail, { merge: false }>();
  if (!course) return null;

  course.lessons.sort((a, b) => a.sort - b.sort || a.title.localeCompare(b.title));
  const { data: hasAccess } = await supabase.rpc("has_course_access", { target: course.id });
  return { course, hasAccess: hasAccess === true };
}
