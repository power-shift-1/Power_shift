import type { Metadata } from "next";
import Link from "next/link";

import { ActionForm } from "@/components/members/ActionForm";
import { AdminColumns, AdminFrame } from "@/components/members/admin/AdminFrame";
import { CourseFields } from "@/components/members/admin/CourseFields";
import { Empty, Panel } from "@/components/members/PageIntro";
import { requireAdmin } from "@/lib/auth";
import { formatPrice } from "@/lib/format";
import { createUserClient } from "@/lib/supabase/server";

import { createCourse } from "../actions";

export const metadata: Metadata = { title: "Admin · Courses" };

type Row = { id: string; slug: string; title: string; price_paise: number; is_published: boolean; lessons: { count: number }[] };

export default async function AdminCourses() {
  await requireAdmin();
  const supabase = (await createUserClient())!;
  const { data } = await supabase
    .from("courses")
    .select("id, slug, title, price_paise, is_published, lessons(count)")
    .order("sort")
    .order("created_at")
    .overrideTypes<Row[], { merge: false }>();

  return (
    <AdminFrame title="Courses" lead="Each course gets its own chat room for its buyers. Lessons marked free are open to every member.">
      <AdminColumns>
        <Panel title="All courses">
          {data?.length ? (
            <ul className="divide-y divide-rule">
              {data.map((course) => (
                <li key={course.id}>
                  <Link href={`/admin/courses/${course.id}`} className="flex flex-wrap items-baseline justify-between gap-2 py-3 hover:underline">
                    <span className="font-ui text-[16px] font-semibold">{course.title}</span>
                    <span className="t-note text-fg-soft">
                      {course.is_published ? "Published" : "Draft"} · {course.lessons[0]?.count ?? 0} lessons · {formatPrice(course.price_paise)}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <Empty>No courses yet. Add the first one.</Empty>
          )}
        </Panel>
        <Panel title="Add a course">
          <ActionForm action={createCourse} submitLabel="Add course" pendingLabel="Adding…">
            <CourseFields />
          </ActionForm>
        </Panel>
      </AdminColumns>
    </AdminFrame>
  );
}
