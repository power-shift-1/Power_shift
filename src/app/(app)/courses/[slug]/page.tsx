import { CircleCheck, Lock, PlayCircle } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { BuyButton } from "@/components/members/BuyButton";
import { ProgressBar, ProgressRing } from "@/components/members/Progress";
import { Arrow } from "@/components/shared/Arrow";
import { Eyebrow } from "@/components/shared/Eyebrow";
import { Button } from "@/components/ui/button";
import { requireMember } from "@/lib/auth";
import { loadCourse } from "@/lib/courses";
import { formatDuration, formatPrice } from "@/lib/format";
import { courses as copy } from "@/lib/members-content";
import { completedLessonIds, share } from "@/lib/progress";
import { createUserClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Course · The Power Shift" };

type Props = { params: Promise<{ slug: string }> };

export default async function CoursePage({ params }: Props) {
  const { slug } = await params;
  await requireMember(`/courses/${slug}`);
  const supabase = (await createUserClient())!;
  const loaded = await loadCourse(supabase, slug);
  if (!loaded) notFound();
  const { course, hasAccess } = loaded;

  const done = await completedLessonIds(supabase, course.lessons.map((lesson) => lesson.id));
  const progress = share(done.size, course.lessons.length);
  const watchable = course.lessons.filter((lesson) => hasAccess || lesson.is_free);
  // Resume at the first lesson not yet finished, or the first one open to this member.
  const next = watchable.find((lesson) => !done.has(lesson.id)) ?? watchable[0] ?? course.lessons[0];
  const totalMinutes = Math.round(course.lessons.reduce((sum, lesson) => sum + (lesson.duration_s ?? 0), 0) / 60);

  return (
    <div className="flex flex-col gap-12">
      <header data-stock="royal" className="relative -mx-[var(--gx)] -mt-10 overflow-hidden lg:-mt-14">
        {course.cover_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={course.cover_url} alt="" className="absolute inset-0 size-full object-cover opacity-35" />
        ) : null}
        <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-[var(--royal-deep)] via-[color-mix(in_oklch,var(--royal-deep),transparent_25%)] to-transparent" />
        <div className="relative flex flex-col gap-6 px-[var(--gx)] pt-10 pb-10 lg:flex-row lg:items-end lg:justify-between lg:pt-16 lg:pb-14">
          <div className="max-w-3xl">
            <Link href="/courses" className="t-note text-fg-soft hover:text-fg">
              ← {copy.eyebrow}
            </Link>
            <h1 className="mt-4 font-display text-[length:clamp(2.25rem,1.6rem+2.6vw,4rem)] leading-[1.04] tracking-[-0.012em] text-balance">
              {course.title}
            </h1>
            <p className="t-note mt-4 text-fg-soft">
              {copy.lessons(course.lessons.length)}
              {totalMinutes ? ` · ${formatDuration(totalMinutes * 60)}` : ""}
              {hasAccess ? ` · ${copy.owned}` : ` · ${formatPrice(course.price_paise)}`}
            </p>
          </div>
          {hasAccess && course.lessons.length ? (
            <div className="flex items-center gap-4">
              <ProgressRing value={progress} size={84} label={copy.progress(done.size, course.lessons.length)} />
              <p className="t-note max-w-40 text-fg-soft">
                {progress >= 1 ? copy.courseComplete : copy.progress(done.size, course.lessons.length)}
              </p>
            </div>
          ) : null}
        </div>
      </header>

      <div className="grid gap-12 lg:grid-cols-[minmax(0,1fr)_380px]">
        <div>
          {course.summary ? <p className="t-body whitespace-pre-line text-fg-soft">{course.summary}</p> : null}

          <section className="mt-12">
            <Eyebrow dash>{copy.outline}</Eyebrow>
            <ol className="mt-5 divide-y divide-rule border-y border-rule">
              {course.lessons.map((lesson, index) => {
                const open = hasAccess || lesson.is_free;
                const finished = done.has(lesson.id);
                const duration = formatDuration(lesson.duration_s);
                return (
                  <li key={lesson.id}>
                    <Link href={`/courses/${course.slug}/${lesson.id}`} className="group flex min-h-16 items-start gap-4 py-4">
                      <span className="t-note w-6 shrink-0 pt-0.5 text-fg-soft tabular-nums">{String(index + 1).padStart(2, "0")}</span>
                      <span className="flex-1">
                        <span className="block font-ui text-[17px] font-semibold group-hover:underline group-hover:underline-offset-4">{lesson.title}</span>
                        {lesson.summary ? <span className="mt-1 block font-ui text-[15px] text-fg-soft">{lesson.summary}</span> : null}
                      </span>
                      <span className="t-note flex shrink-0 items-center gap-2 text-fg-soft">
                        {duration}
                        {lesson.is_free && !hasAccess ? <span className="text-label">{copy.free}</span> : null}
                        {finished ? (
                          <CircleCheck aria-label={copy.completed} className="size-5 text-gold-shape" />
                        ) : open ? (
                          <PlayCircle aria-hidden="true" className="size-5 text-fg" />
                        ) : (
                          <Lock aria-label={copy.locked} className="size-4" />
                        )}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ol>
          </section>
        </div>

        <aside className="flex flex-col gap-4 lg:sticky lg:top-24 lg:self-start">
          {hasAccess ? (
            <>
              <ProgressBar value={progress} label={copy.progress(done.size, course.lessons.length)} />
              {next ? (
                <Button asChild variant="reserve" size="lg" className="w-full justify-between">
                  <Link href={`/courses/${course.slug}/${next.id}`}>
                    <span>{done.size ? `${copy.next}: ${next.title}` : copy.open}</span>
                    <Arrow />
                  </Link>
                </Button>
              ) : null}
            </>
          ) : (
            <>
              <p className="font-display text-[2rem] leading-none">{formatPrice(course.price_paise)}</p>
              <BuyButton courseId={course.id} price={formatPrice(course.price_paise)} />
              {next?.is_free ? (
                <Button asChild variant="reserve-quiet" size="default" className="w-full justify-between">
                  <Link href={`/courses/${course.slug}/${next.id}`}>
                    <span>{copy.start}</span>
                    <Arrow />
                  </Link>
                </Button>
              ) : null}
            </>
          )}
        </aside>
      </div>
    </div>
  );
}
