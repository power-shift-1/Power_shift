import { CircleCheck, Lock } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { BuyButton } from "@/components/members/BuyButton";
import { LessonComplete } from "@/components/members/LessonComplete";
import { MarkSeen } from "@/components/members/MarkSeen";
import { ProgressBar } from "@/components/members/Progress";
import { ResourceList } from "@/components/members/ResourceList";
import { requireMember } from "@/lib/auth";
import { loadCourse } from "@/lib/courses";
import { formatPrice } from "@/lib/format";
import { courses as copy } from "@/lib/members-content";
import { completedLessonIds, share } from "@/lib/progress";
import { createUserClient } from "@/lib/supabase/server";
import { embedSrc, type VideoRef } from "@/lib/video";
import { cn } from "cn";

export const metadata: Metadata = { title: "Lesson · The Power Shift" };

type Props = { params: Promise<{ slug: string; lesson: string }> };

export default async function LessonPage({ params }: Props) {
  const { slug, lesson: lessonId } = await params;
  await requireMember(`/courses/${slug}/${lessonId}`);
  const supabase = (await createUserClient())!;
  const loaded = await loadCourse(supabase, slug);
  const index = loaded?.course.lessons.findIndex((lesson) => lesson.id === lessonId) ?? -1;
  if (!loaded || index === -1) notFound();

  const { course, hasAccess } = loaded;
  const lesson = course.lessons[index];
  const canWatch = hasAccess || lesson.is_free;

  // Row level security returns no row for a locked lesson, so its video ID never reaches the page.
  const { data: media } = canWatch
    ? await supabase.from("lesson_media").select("provider, video_id, vimeo_hash").eq("lesson_id", lesson.id).maybeSingle()
    : { data: null };
  const video: VideoRef | null = media ? { provider: media.provider, videoId: media.video_id, vimeoHash: media.vimeo_hash } : null;
  const done = await completedLessonIds(supabase, course.lessons.map((item) => item.id));
  const previous = course.lessons[index - 1];
  const next = course.lessons[index + 1];

  return (
    <div className="grid grid-cols-1 gap-10 lg:grid-cols-[minmax(0,1fr)_320px]">
      <div>
        <Link href={`/courses/${course.slug}`} className="t-note text-fg-soft hover:text-fg">
          ← {course.title}
        </Link>
        <h1 className="mt-3 font-display text-[length:clamp(2rem,1.5rem+1.8vw,3rem)] leading-[1.1] text-balance">{lesson.title}</h1>

        <div className="mt-6 aspect-video w-full bg-ink">
          {canWatch && video ? (
            <iframe
              src={embedSrc(video)}
              title={lesson.title}
              className="size-full"
              allow="autoplay; fullscreen; picture-in-picture; encrypted-media"
              allowFullScreen
              referrerPolicy="strict-origin-when-cross-origin"
            />
          ) : (
            <div data-stock="ink" className="flex size-full flex-col items-center justify-center gap-4 p-6 text-center">
              {canWatch ? (
                <p className="t-note">{copy.noVideo}</p>
              ) : (
                <>
                  <Lock aria-hidden="true" className="size-8 text-gold-line" />
                  <p className="font-display text-[1.75rem] leading-[1.15]">{copy.lockedTitle}</p>
                  <p className="t-note max-w-sm text-fg-soft">{copy.lockedLead}</p>
                </>
              )}
            </div>
          )}
        </div>

        {!canWatch ? (
          <div className="mt-6 max-w-md">
            <BuyButton courseId={course.id} price={formatPrice(course.price_paise)} />
          </div>
        ) : (
          <div className="mt-6 flex flex-wrap items-center gap-4">
            <MarkSeen lessonId={lesson.id} />
            <LessonComplete lessonId={lesson.id} completed={done.has(lesson.id)} />
            {hasAccess ? (
              <span className="t-note text-fg-soft">{copy.progress(done.size, course.lessons.length)}</span>
            ) : null}
          </div>
        )}

        {lesson.summary ? <p className="t-body mt-8 whitespace-pre-line text-fg-soft">{lesson.summary}</p> : null}

        {canWatch ? <ResourceList supabase={supabase} lessonId={lesson.id} from={`/courses/${course.slug}/${lesson.id}`} /> : null}

        <nav aria-label="Lessons" className="mt-10 flex justify-between gap-4 border-t border-rule pt-5">
          {previous ? (
            <Link href={`/courses/${course.slug}/${previous.id}`} className="t-note hover:underline">
              ← {copy.previous}
            </Link>
          ) : (
            <span />
          )}
          {next ? (
            <Link href={`/courses/${course.slug}/${next.id}`} className="t-note hover:underline">
              {copy.next} →
            </Link>
          ) : null}
        </nav>
      </div>

      <aside>
        <h2 className="t-eyebrow">{copy.back}</h2>
        {hasAccess ? (
          <ProgressBar value={share(done.size, course.lessons.length)} label={copy.progress(done.size, course.lessons.length)} className="mt-3" />
        ) : null}
        <ol className="mt-3 divide-y divide-rule border-y border-rule">
          {course.lessons.map((item) => (
            <li key={item.id}>
              <Link
                href={`/courses/${course.slug}/${item.id}`}
                aria-current={item.id === lesson.id ? "page" : undefined}
                className={cn(
                  "flex items-center justify-between gap-3 py-3 font-ui text-[15px]",
                  item.id === lesson.id ? "font-semibold" : "text-fg-soft hover:text-fg",
                )}
              >
                <span>{item.title}</span>
                {done.has(item.id) ? (
                  <CircleCheck aria-label={copy.completed} className="size-4 shrink-0 text-gold-shape" />
                ) : hasAccess || item.is_free ? null : (
                  <Lock aria-label={copy.locked} className="size-4 shrink-0" />
                )}
              </Link>
            </li>
          ))}
        </ol>
      </aside>
    </div>
  );
}
