"use client";

import { Check } from "lucide-react";
import { useRouter } from "next/navigation";
import { useOptimistic, useTransition } from "react";

import { setLessonComplete } from "@/app/(app)/courses/actions";
import { Button } from "@/components/ui/button";
import { courses as copy } from "@/lib/members-content";

/** Toggles the lesson's completion, updating at once and settling when the server answers. */
export function LessonComplete({ lessonId, completed }: { lessonId: string; completed: boolean }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [done, setDone] = useOptimistic(completed);

  return (
    <Button
      type="button"
      variant={done ? "reserve-quiet" : "reserve"}
      size="default"
      aria-pressed={done}
      aria-busy={pending || undefined}
      onClick={() =>
        startTransition(async () => {
          setDone(!done);
          await setLessonComplete(lessonId, !done);
          router.refresh();
        })
      }
    >
      {done ? <Check aria-hidden="true" /> : null}
      <span>{done ? copy.completed : copy.markComplete}</span>
    </Button>
  );
}
