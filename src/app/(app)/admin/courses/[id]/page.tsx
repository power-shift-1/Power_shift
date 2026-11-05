import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { ActionForm } from "@/components/members/ActionForm";
import { AdminColumns, AdminFrame } from "@/components/members/admin/AdminFrame";
import { CourseFields } from "@/components/members/admin/CourseFields";
import { ResourceUploader } from "@/components/members/admin/ResourceUploader";
import { CheckboxField, Field, TextAreaField } from "@/components/members/Field";
import { Empty, Panel } from "@/components/members/PageIntro";
import { requireAdmin } from "@/lib/auth";
import { createUserClient } from "@/lib/supabase/server";
import { watchUrl } from "@/lib/video";

import { addLinkResource, deleteCourse, deleteLesson, deleteResource, saveLesson, updateCourse } from "../../actions";

export const metadata: Metadata = { title: "Admin · Edit course" };

type Lesson = {
  id: string;
  title: string;
  summary: string;
  is_free: boolean;
  duration_s: number | null;
  sort: number;
  lesson_media: { provider: "youtube" | "vimeo"; video_id: string; vimeo_hash: string | null } | null;
  lesson_resources: { id: string; title: string; kind: "file" | "link"; url: string | null; sort: number }[];
};
type Course = {
  id: string;
  slug: string;
  title: string;
  summary: string;
  cover_url: string | null;
  price_paise: number;
  is_published: boolean;
  sort: number;
  lessons: Lesson[];
};

type Props = { params: Promise<{ id: string }> };

function LessonFields({ courseId, lesson, nextSort }: { courseId: string; lesson?: Lesson; nextSort: number }) {
  const prefix = lesson ? `lesson-${lesson.id}` : "lesson-new";
  const media = lesson?.lesson_media;
  return (
    <>
      <input type="hidden" name="course_id" value={courseId} />
      {lesson ? <input type="hidden" name="id" value={lesson.id} /> : null}
      <Field id={`${prefix}-title`} name="title" label="Title" required maxLength={160} defaultValue={lesson?.title} />
      <Field
        id={`${prefix}-video`}
        name="video_url"
        label="YouTube or Vimeo link"
        type="url"
        placeholder="https://vimeo.com/123456789"
        defaultValue={media ? watchUrl({ provider: media.provider, videoId: media.video_id, vimeoHash: media.vimeo_hash }) : ""}
        hint="For paid lessons, use Vimeo with privacy set to embed only on this site. Anyone with a YouTube link can watch it."
      />
      <TextAreaField id={`${prefix}-summary`} name="summary" label="Notes under the video" maxLength={2000} defaultValue={lesson?.summary} />
      <div className="grid grid-cols-2 gap-5">
        <Field id={`${prefix}-minutes`} name="minutes" label="Length (minutes)" type="number" min={0} defaultValue={lesson?.duration_s ? Math.round(lesson.duration_s / 60) : ""} />
        <Field id={`${prefix}-sort`} name="sort" label="Order" type="number" defaultValue={lesson?.sort ?? nextSort} />
      </div>
      <CheckboxField id={`${prefix}-free`} name="is_free" label="Free: every member can watch it" defaultChecked={lesson?.is_free} />
    </>
  );
}

/** Worksheets and links for one lesson. Members see them under the video when they may watch it. */
function LessonResources({ lesson }: { lesson: Lesson }) {
  const resources = [...lesson.lesson_resources].sort((a, b) => a.sort - b.sort);
  return (
    <section className="border-t border-rule pt-5">
      <h4 className="t-eyebrow">Resources</h4>
      {resources.length ? (
        <ul className="mt-3 divide-y divide-rule">
          {resources.map((resource) => (
            <li key={resource.id} className="flex flex-wrap items-center justify-between gap-3 py-2">
              <span className="min-w-0 font-ui text-[15px]">
                <span className="font-semibold">{resource.title}</span>
                <span className="t-note block truncate text-fg-soft">{resource.kind === "link" ? resource.url : "File"}</span>
              </span>
              <ActionForm action={deleteResource} submitLabel="Delete" variant="ghost" confirm={`Delete "${resource.title}"?`}>
                <input type="hidden" name="id" value={resource.id} />
              </ActionForm>
            </li>
          ))}
        </ul>
      ) : (
        <p className="t-note mt-2 text-fg-soft">No resources yet.</p>
      )}
      <div className="mt-5 grid gap-8 md:grid-cols-2">
        <ActionForm action={addLinkResource} submitLabel="Add link" variant="outline">
          <input type="hidden" name="lesson_id" value={lesson.id} />
          <Field id={`link-title-${lesson.id}`} name="title" label="Link title" required maxLength={160} placeholder="Reading list" />
          <Field id={`link-url-${lesson.id}`} name="url" label="Address" type="url" required placeholder="https://" />
          <input type="hidden" name="sort" value={resources.length + 1} />
        </ActionForm>
        <ResourceUploader lessonId={lesson.id} />
      </div>
    </section>
  );
}

export default async function AdminCourse({ params }: Props) {
  await requireAdmin();
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const supabase = (await createUserClient())!;
  const { data: course } = await supabase
    .from("courses")
    .select(
      "id, slug, title, summary, cover_url, price_paise, is_published, sort, lessons(id, title, summary, is_free, duration_s, sort, lesson_media(provider, video_id, vimeo_hash), lesson_resources(id, title, kind, url, sort))",
    )
    .eq("id", id)
    .maybeSingle()
    .overrideTypes<Course, { merge: false }>();
  if (!course) notFound();
  const lessons = [...course.lessons].sort((a, b) => a.sort - b.sort);
  const nextSort = (lessons.at(-1)?.sort ?? 0) + 1;

  return (
    <AdminFrame title={course.title} lead={`${course.is_published ? "Published" : "Draft"} · /courses/${course.slug}`}>
      <Link href={`/courses/${course.slug}`} className="t-note -mt-6 underline underline-offset-4">
        View as a member
      </Link>
      <AdminColumns>
        <Panel title={`Lessons (${lessons.length})`}>
          {lessons.length ? (
            <ul className="divide-y divide-rule border-y border-rule">
              {lessons.map((lesson) => (
                <li key={lesson.id}>
                  <details className="group py-3">
                    <summary className="flex cursor-pointer list-none items-baseline justify-between gap-3">
                      <span className="font-ui text-[16px] font-semibold">
                        {lesson.sort}. {lesson.title}
                      </span>
                      <span className="t-note text-fg-soft">
                        {lesson.is_free ? "Free" : "Paid"} · {lesson.lesson_media ? lesson.lesson_media.provider : "no video"}
                        {lesson.lesson_resources.length ? ` · ${lesson.lesson_resources.length} resources` : ""}
                      </span>
                    </summary>
                    <div className="mt-5 flex flex-col gap-6 pb-3">
                      <ActionForm action={saveLesson} submitLabel="Save lesson" pendingLabel="Saving…">
                        <LessonFields courseId={course.id} lesson={lesson} nextSort={nextSort} />
                      </ActionForm>
                      <LessonResources lesson={lesson} />
                      <ActionForm action={deleteLesson} submitLabel="Delete lesson" variant="outline" confirm={`Delete "${lesson.title}"?`}>
                        <input type="hidden" name="id" value={lesson.id} />
                      </ActionForm>
                    </div>
                  </details>
                </li>
              ))}
            </ul>
          ) : (
            <Empty>No lessons yet.</Empty>
          )}
          <div className="mt-10">
            <h3 className="font-display text-[1.5rem]">Add a lesson</h3>
            <ActionForm action={saveLesson} submitLabel="Add lesson" pendingLabel="Adding…" className="mt-5">
              <LessonFields courseId={course.id} nextSort={nextSort} />
            </ActionForm>
          </div>
        </Panel>

        <Panel title="Course details">
          <ActionForm action={updateCourse} submitLabel="Save course" pendingLabel="Saving…">
            <input type="hidden" name="id" value={course.id} />
            <CourseFields course={course} />
          </ActionForm>
          <div className="mt-10 border-t border-rule pt-6">
            <ActionForm
              action={deleteCourse}
              submitLabel="Delete course"
              variant="outline"
              confirm={`Delete "${course.title}", its lessons and its chat room? This can't be undone.`}
            >
              <input type="hidden" name="id" value={course.id} />
            </ActionForm>
          </div>
        </Panel>
      </AdminColumns>
    </AdminFrame>
  );
}
