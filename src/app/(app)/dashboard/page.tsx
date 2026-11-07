import { BookOpen, CalendarDays, Megaphone, PlayCircle } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { CourseCover } from "@/components/members/CourseCover";
import { Empty, EmptyState, Panel } from "@/components/members/PageIntro";
import { ProgressRing } from "@/components/members/Progress";
import { SessionList } from "@/components/members/SessionList";
import { Arrow } from "@/components/shared/Arrow";
import { Eyebrow } from "@/components/shared/Eyebrow";
import { Button } from "@/components/ui/button";
import { requireMember } from "@/lib/auth";
import { formatDate } from "@/lib/format";
import { courses as courseCopy, dashboard } from "@/lib/members-content";
import { completedByCourse, nextLesson, share } from "@/lib/progress";
import { createUserClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Dashboard · The Power Shift" };

type Progress = {
  last_seen_at: string;
  completed_at: string | null;
  lessons: { id: string; title: string; courses: { slug: string; title: string; cover_url: string | null } | null } | null;
};
type Owned = { courses: { id: string; slug: string; title: string; cover_url: string | null; lessons: { count: number }[] } | null };
type Announcement = { id: string; title: string; body: string; published_at: string; courses: { title: string } | null };
type FreeLesson = { id: string; title: string; courses: { slug: string; title: string; cover_url: string | null; is_published: boolean } | null };

export default async function DashboardPage() {
  const member = await requireMember("/dashboard");
  const supabase = (await createUserClient())!;

  const [progress, owned, announcements, attended, completed, freeLessons] = await Promise.all([
    supabase
      .from("lesson_progress")
      .select("last_seen_at, completed_at, lessons(id, title, courses(slug, title, cover_url))")
      .order("last_seen_at", { ascending: false })
      .limit(4)
      .overrideTypes<Progress[], { merge: false }>(),
    supabase
      .from("purchases")
      .select("courses(id, slug, title, cover_url, lessons(count))")
      .eq("user_id", member.id)
      .eq("status", "paid")
      .order("created_at", { ascending: false })
      .overrideTypes<Owned[], { merge: false }>(),
    supabase
      .from("announcements")
      .select("id, title, body, published_at, courses(title)")
      .not("published_at", "is", null)
      .order("published_at", { ascending: false })
      .limit(5)
      .overrideTypes<Announcement[], { merge: false }>(),
    supabase.from("profiles").select("attended_masterclass").eq("id", member.id).maybeSingle(),
    completedByCourse(supabase),
    supabase
      .from("lessons")
      .select("id, title, courses(slug, title, cover_url, is_published)")
      .eq("is_free", true)
      .order("sort")
      .limit(5)
      .overrideTypes<FreeLesson[], { merge: false }>(),
  ]);

  const firstName = member.name.split(/\s+/)[0] ?? member.name;
  const ownedCourses = (owned.data ?? []).flatMap((row) => (row.courses ? [row.courses] : []));
  const recent = (progress.data ?? []).filter((row) => row.lessons?.courses);
  // Up next: the lesson last watched if it isn't finished, else the next unfinished one in that course,
  // else a free lesson to begin with.
  const latest = recent[0];
  const latestCourse = latest?.lessons?.courses;
  const resume = !latest
    ? null
    : !latest.completed_at
      ? latest.lessons
      : latestCourse
        ? await nextLesson(supabase, latestCourse.slug, ownedCourses.some((course) => course.slug === latestCourse.slug))
        : null;
  const starter = (freeLessons.data ?? []).find((lesson) => lesson.courses?.is_published) ?? null;
  const upNext = resume ?? (recent.length ? null : starter);
  const totalDone = [...completed.values()].reduce((sum, n) => sum + n, 0);

  return (
    <div className="flex flex-col gap-12">
      <section data-stock="royal" className="relative -mx-[var(--gx)] -mt-10 overflow-hidden lg:-mt-14">
        <div aria-hidden="true" className="absolute -top-24 -right-24 size-80 rounded-full border border-[color-mix(in_oklch,var(--gold-line),transparent_50%)]" />
        <div aria-hidden="true" className="absolute -top-10 -right-10 size-52 rounded-full border border-[color-mix(in_oklch,var(--gold-line),transparent_70%)]" />
        <div className="relative grid grid-cols-1 gap-8 px-[var(--gx)] py-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,460px)] lg:items-end lg:py-14">
          <div>
            <Eyebrow dash>{dashboard.eyebrow}</Eyebrow>
            <h1 className="mt-4 font-display text-[length:clamp(2.5rem,1.8rem+2.8vw,4.25rem)] leading-[1.02] tracking-[-0.015em]">
              {dashboard.greeting(firstName)}
            </h1>
            <p className="t-body mt-4 text-fg-soft">{dashboard.lead}</p>
            {attended.data?.attended_masterclass ? <p className="t-note mt-3 text-label">{dashboard.attendee}</p> : null}
            <p className="t-note mt-6 text-fg-soft">
              {dashboard.completedLessons(totalDone)} · {dashboard.coursesOwned(ownedCourses.length)}
            </p>
          </div>

          {upNext?.courses ? (
            <Link
              href={`/courses/${upNext.courses.slug}/${upNext.id}`}
              data-stock="paper"
              className="group flex items-center gap-4 p-4 shadow-[0_18px_40px_rgb(0_0_0/.25)] transition-transform duration-300 hover:-translate-y-0.5 motion-reduce:hover:translate-y-0"
            >
              <span className="relative block w-28 shrink-0 overflow-hidden sm:w-36">
                <CourseCover title={upNext.courses.title} src={upNext.courses.cover_url} />
                <PlayCircle aria-hidden="true" className="absolute inset-0 m-auto size-9 text-t-cream drop-shadow" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="t-eyebrow block">{resume ? dashboard.upNext : dashboard.startFirst}</span>
                <span className="mt-1 block font-ui text-[17px] font-semibold leading-snug">{upNext.title}</span>
                <span className="t-note block truncate text-fg-soft">{upNext.courses.title}</span>
              </span>
              <Arrow className="shrink-0 transition-transform group-hover:translate-x-1" />
            </Link>
          ) : null}
        </div>
      </section>

      <Panel
        title={dashboard.coursesTitle}
        action={
          <Link href="/courses" className="t-note underline underline-offset-4">
            {dashboard.browse}
          </Link>
        }
      >
        {ownedCourses.length ? (
          // Swipes sideways on phones; a grid from tablets up.
          <ul className="-mx-[var(--gx)] flex snap-x snap-mandatory scroll-px-[var(--gx)] gap-4 overflow-x-auto px-[var(--gx)] pb-2 [scrollbar-width:thin] md:mx-0 md:grid md:grid-cols-2 md:overflow-visible md:px-0 xl:grid-cols-3">
            {ownedCourses.map((course) => {
              const total = course.lessons[0]?.count ?? 0;
              const done = completed.get(course.id) ?? 0;
              return (
                <li key={course.id} className="w-[78%] shrink-0 snap-start md:w-auto">
                  <Link href={`/courses/${course.slug}`} className="group block border border-rule p-4 transition-colors hover:border-t-ink">
                    <CourseCover title={course.title} src={course.cover_url} />
                    <div className="mt-4 flex items-center gap-4">
                      <ProgressRing value={share(done, total)} size={52} label={courseCopy.progress(done, total)} decorative />
                      <div className="min-w-0">
                        <h3 className="truncate font-ui text-[17px] font-semibold group-hover:underline group-hover:underline-offset-4">{course.title}</h3>
                        <p className="t-note text-fg-soft">{courseCopy.progress(done, total)}</p>
                      </div>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        ) : (
          <EmptyState
            icon={BookOpen}
            action={
              <Button asChild variant="reserve" size="default">
                <Link href="/courses">
                  <span>{dashboard.browse}</span>
                  <Arrow />
                </Link>
              </Button>
            }
          >
            {dashboard.coursesEmpty}
          </EmptyState>
        )}
      </Panel>

      <div className="grid grid-cols-1 gap-12 lg:grid-cols-2">
        <Panel title={dashboard.continueTitle}>
          {recent.length ? (
            <ul className="flex flex-col divide-y divide-rule">
              {recent.map((row) =>
                row.lessons?.courses ? (
                  <li key={row.lessons.id}>
                    <Link href={`/courses/${row.lessons.courses.slug}/${row.lessons.id}`} className="group flex min-h-14 items-center justify-between gap-4 py-3">
                      <span className="min-w-0">
                        <span className="block font-ui text-[16px] font-semibold">{row.lessons.title}</span>
                        <span className="t-note text-fg-soft">
                          {row.lessons.courses.title}
                          {row.completed_at ? ` · ${courseCopy.completed}` : ""}
                        </span>
                      </span>
                      <Arrow className="shrink-0 transition-transform group-hover:translate-x-1" />
                    </Link>
                  </li>
                ) : null,
              )}
            </ul>
          ) : (
            <Empty>{dashboard.continueEmpty}</Empty>
          )}
        </Panel>

        <Panel title={dashboard.sessionsTitle} action={<CalendarDays aria-hidden="true" className="size-5 text-label" />}>
          <SessionList limit={5} />
        </Panel>
      </div>

      <Panel title={dashboard.announcementsTitle} action={<Megaphone aria-hidden="true" className="size-5 text-label" />}>
        {announcements.data?.length ? (
          <ul className="grid grid-cols-1 gap-6 md:grid-cols-2">
            {announcements.data.map((item) => (
              <li key={item.id} className="border-l-[3px] border-l-gold-line pl-4">
                <p className="t-note text-fg-soft">
                  {formatDate(item.published_at)}
                  {item.courses ? ` · ${item.courses.title}` : ""}
                </p>
                <h3 className="mt-1 font-ui text-[17px] font-semibold">{item.title}</h3>
                {item.body ? <p className="mt-1 font-ui text-[15px] leading-[1.55] whitespace-pre-line text-fg-soft">{item.body}</p> : null}
              </li>
            ))}
          </ul>
        ) : (
          <Empty>{dashboard.announcementsEmpty}</Empty>
        )}
      </Panel>
    </div>
  );
}
