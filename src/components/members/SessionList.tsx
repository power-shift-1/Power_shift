import { Lock } from "lucide-react";

import { Button } from "@/components/ui/button";
import { formatDateTime } from "@/lib/format";
import { dashboard } from "@/lib/members-content";
import { createUserClient } from "@/lib/supabase/server";

import { Empty } from "./PageIntro";

type Session = {
  id: string;
  title: string;
  description: string;
  starts_at: string;
  duration_min: number;
  courses: { title: string } | null;
  // Row level security leaves this null for anyone who may not join.
  live_session_links: { join_url: string } | null;
};

// A session stays listed for three hours after it starts, so late joiners can still find the link.
const STILL_RUNNING_MS = 3 * 60 * 60_000;

async function loadUpcoming(limit: number) {
  const supabase = (await createUserClient())!;
  const { data } = await supabase
    .from("live_sessions")
    .select("id, title, description, starts_at, duration_min, courses(title), live_session_links(join_url)")
    .gte("starts_at", new Date(Date.now() - STILL_RUNNING_MS).toISOString())
    .order("starts_at")
    .limit(limit)
    .overrideTypes<Session[], { merge: false }>();
  return data ?? [];
}

/** Upcoming live sessions. The joining link only appears for members who may join. */
export async function SessionList({ limit }: { limit: number }) {
  const data = await loadUpcoming(limit);
  if (!data.length) return <Empty>{dashboard.sessionsEmpty}</Empty>;

  return (
    <ul className="flex flex-col divide-y divide-rule">
      {data.map((session) => (
        <li key={session.id} className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="t-note text-fg-soft">
              {formatDateTime(session.starts_at)} · {session.duration_min} min
              {session.courses ? ` · ${session.courses.title}` : ""}
            </p>
            <h3 className="mt-1 font-ui text-[17px] font-semibold">{session.title}</h3>
            {session.description ? <p className="mt-1 font-ui text-[15px] text-fg-soft">{session.description}</p> : null}
          </div>
          {session.live_session_links ? (
            <Button asChild variant="reserve" size="default">
              <a href={session.live_session_links.join_url} target="_blank" rel="noopener noreferrer">
                {dashboard.join}
              </a>
            </Button>
          ) : (
            <span className="t-note inline-flex items-center gap-2 text-fg-soft">
              <Lock aria-hidden="true" className="size-4" />
              {dashboard.joinLocked}
            </span>
          )}
        </li>
      ))}
    </ul>
  );
}
