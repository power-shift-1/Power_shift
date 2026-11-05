"use client";

import { useEffect } from "react";

import { markLessonSeen } from "@/app/(app)/courses/actions";

/** Records the visit after the lesson has shown, so the page never waits on it. */
export function MarkSeen({ lessonId }: { lessonId: string }) {
  useEffect(() => {
    void markLessonSeen(lessonId);
  }, [lessonId]);
  return null;
}
