import type { Metadata } from "next";

import { ActionForm } from "@/components/members/ActionForm";
import { AdminColumns, AdminFrame } from "@/components/members/admin/AdminFrame";
import { AudienceSelect } from "@/components/members/admin/AudienceSelect";
import { Field, TextAreaField } from "@/components/members/Field";
import { Empty, Panel } from "@/components/members/PageIntro";
import { requireAdmin } from "@/lib/auth";
import { formatDateTime } from "@/lib/format";
import { createUserClient } from "@/lib/supabase/server";

import { createSession, deleteSession } from "../actions";

export const metadata: Metadata = { title: "Admin · Live sessions" };

type Row = {
  id: string;
  title: string;
  starts_at: string;
  duration_min: number;
  courses: { title: string } | null;
  live_session_links: { join_url: string } | null;
};

export default async function AdminSessions() {
  await requireAdmin();
  const supabase = (await createUserClient())!;
  const [{ data }, { data: courses }] = await Promise.all([
    supabase
      .from("live_sessions")
      .select("id, title, starts_at, duration_min, courses(title), live_session_links(join_url)")
      .order("starts_at", { ascending: false })
      .overrideTypes<Row[], { merge: false }>(),
    supabase.from("courses").select("id, title").order("sort"),
  ]);

  return (
    <AdminFrame title="Live sessions" lead="Every member sees the schedule. Only the chosen audience gets the joining link.">
      <AdminColumns>
        <Panel title="Scheduled">
          {data?.length ? (
            <ul className="divide-y divide-rule">
              {data.map((session) => (
                <li key={session.id} className="flex flex-wrap items-center justify-between gap-3 py-4">
                  <div>
                    <p className="t-note text-fg-soft">
                      {formatDateTime(session.starts_at)} · {session.duration_min} min · {session.courses ? `Buyers of ${session.courses.title}` : "Every member"}
                    </p>
                    <h3 className="mt-1 font-ui text-[17px] font-semibold">{session.title}</h3>
                    <p className="t-note text-fg-soft">{session.live_session_links?.join_url ?? "No joining link"}</p>
                  </div>
                  <ActionForm action={deleteSession} submitLabel="Delete" variant="ghost" confirm={`Delete "${session.title}"?`}>
                    <input type="hidden" name="id" value={session.id} />
                  </ActionForm>
                </li>
              ))}
            </ul>
          ) : (
            <Empty>Nothing scheduled.</Empty>
          )}
        </Panel>
        <Panel title="Schedule a session">
          <ActionForm action={createSession} submitLabel="Schedule" pendingLabel="Saving…">
            <Field id="session-title" name="title" label="Title" required maxLength={160} />
            <TextAreaField id="session-description" name="description" label="Description" maxLength={2000} />
            <div className="grid grid-cols-2 gap-5">
              <Field id="session-start" name="starts_at" label="Starts (IST)" type="datetime-local" required />
              <Field id="session-duration" name="duration_min" label="Minutes" type="number" min={5} max={600} defaultValue={60} required />
            </div>
            <AudienceSelect id="session-audience" courses={courses ?? []} />
            <Field id="session-link" name="join_url" label="Zoom or Meet link" type="url" placeholder="https://" />
          </ActionForm>
        </Panel>
      </AdminColumns>
    </AdminFrame>
  );
}
