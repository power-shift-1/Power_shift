import { BookOpen } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { CourseCover } from "@/components/members/CourseCover";
import { EmptyState, PageIntro } from "@/components/members/PageIntro";
import { ProgressBar } from "@/components/members/Progress";
import { requireMember } from "@/lib/auth";
import { formatPrice } from "@/lib/format";
import { courses as copy } from "@/lib/members-content";
import { completedByCourse, share } from "@/lib/progress";
import { createUserClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Courses · The Power Shift" };

type Course = {
  id: string;
  slug: string;
  title: string;
  summary: string;
  cover_url: string | null;
  price_paise: number;
  is_published: boolean;
  lessons: { count: number }[];
};

export default async function CoursesPage() {
  const member = await requireMember("/courses");
  const supabase = (await createUserClient())!;
  const [{ data: list }, { data: owned }, completed] = await Promise.all([
    supabase
      .from("courses")
      .select("id, slug, title, summary, cover_url, price_paise, is_published, lessons(count)")
      .order("sort")
      .order("created_at")
      .overrideTypes<Course[], { merge: false }>(),
    supabase.from("purchases").select("course_id").eq("user_id", member.id).eq("status", "paid"),
    completedByCourse(supabase),
  ]);
  const ownedIds = new Set((owned ?? []).map((row) => row.course_id as string));

  return (
    <div className="flex flex-col gap-10">
      <PageIntro eyebrow={copy.eyebrow} title={copy.title} lead={copy.lead} />
      {list?.length ? (
        <ul className="grid gap-x-6 gap-y-10 sm:grid-cols-2 xl:grid-cols-3">
          {list.map((course) => {
            const total = course.lessons[0]?.count ?? 0;
            const done = completed.get(course.id) ?? 0;
            const owns = ownedIds.has(course.id);
            return (
              <li key={course.id}>
                <Link href={`/courses/${course.slug}`} className="group block">
                  <CourseCover title={course.title} src={course.cover_url} />
                  <div className="mt-4 flex items-baseline justify-between gap-3">
                    <h2 className="font-display text-[1.625rem] leading-[1.15] group-hover:underline group-hover:underline-offset-4">{course.title}</h2>
                    <span className="t-note shrink-0">{!course.is_published ? copy.draft : owns ? copy.owned : formatPrice(course.price_paise)}</span>
                  </div>
                  <p className="t-note mt-1 text-fg-soft">{owns && total ? copy.progress(done, total) : copy.lessons(total)}</p>
                  {owns && total ? <ProgressBar value={share(done, total)} label={copy.progress(done, total)} className="mt-2" /> : null}
                  {course.summary ? <p className="mt-3 line-clamp-3 font-ui text-[15px] leading-[1.55] text-fg-soft">{course.summary}</p> : null}
                </Link>
              </li>
            );
          })}
        </ul>
      ) : (
        <EmptyState icon={BookOpen}>{copy.empty}</EmptyState>
      )}
    </div>
  );
}
