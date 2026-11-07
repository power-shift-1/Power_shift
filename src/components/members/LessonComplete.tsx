"use client";

import { Check } from "lucide-react";
import { useOptimistic, useTransition } from "react";

import { setLessonComplete } from "@/app/(app)/courses/actions";
import { Button } from "@/components/ui/button";
import { courses as copy } from "@/lib/members-content";

/**
 * Ticks the lesson off, or back on, showing the change at once. The label says what a press will do
 * next, so screen readers hear an action rather than a state. The Server Action revalidates the page,
 * which refreshes the progress ring with no separate refresh.
 */
export function LessonComplete({ lessonId, completed }: { lessonId: string; completed: boolean }) {
  const [pending, startTransition] = useTransition();
  const [done, setDone] = useOptimistic(completed);

  return (
    <div className="flex flex-wrap items-center gap-3">
      {done ? (
        <span className="t-note inline-flex items-center gap-1.5 font-semibold text-label">
          <Check aria-hidden="true" className="size-4" />
          {copy.completed}
        </span>
      ) : null}
      <Button
        type="button"
        variant={done ? "reserve-quiet" : "reserve"}
        size="default"
        aria-busy={pending || undefined}
        className="min-h-11"
        onClick={() =>
          startTransition(async () => {
            setDone(!done);
            await setLessonComplete(lessonId, !done);
          })
        }
      >
        {done ? copy.undoComplete : copy.markComplete}
      </Button>
    </div>
  );
}
