import type { Metadata } from "next";

import { ActionForm } from "@/components/members/ActionForm";
import { AdminColumns, AdminFrame } from "@/components/members/admin/AdminFrame";
import { AudienceSelect } from "@/components/members/admin/AudienceSelect";
import { CheckboxField, Field, TextAreaField } from "@/components/members/Field";
import { Empty, Panel } from "@/components/members/PageIntro";
import { requireAdmin } from "@/lib/auth";
import { formatDateTime } from "@/lib/format";
import { createUserClient } from "@/lib/supabase/server";

import { createAnnouncement, deleteAnnouncement, setAnnouncementPublished } from "../actions";

export const metadata: Metadata = { title: "Admin · Announcements" };

type Row = { id: string; title: string; body: string; published_at: string | null; created_at: string; courses: { title: string } | null };

export default async function AdminAnnouncements() {
  await requireAdmin();
  const supabase = (await createUserClient())!;
  const [{ data }, { data: courses }] = await Promise.all([
    supabase
      .from("announcements")
      .select("id, title, body, published_at, created_at, courses(title)")
      .order("created_at", { ascending: false })
      .overrideTypes<Row[], { merge: false }>(),
    supabase.from("courses").select("id, title").order("sort"),
  ]);

  return (
    <AdminFrame title="Announcements" lead="Published announcements appear on every member's dashboard, newest first.">
      <AdminColumns>
        <Panel title="All announcements">
          {data?.length ? (
            <ul className="divide-y divide-rule">
              {data.map((item) => (
                <li key={item.id} className="flex flex-col gap-3 py-4">
                  <div>
                    <p className="t-note text-fg-soft">
                      {item.published_at ? `Published ${formatDateTime(item.published_at)}` : "Draft"} · {item.courses ? `Buyers of ${item.courses.title}` : "Every member"}
                    </p>
                    <h3 className="mt-1 font-ui text-[17px] font-semibold">{item.title}</h3>
                    {item.body ? <p className="mt-1 line-clamp-3 font-ui text-[15px] whitespace-pre-line text-fg-soft">{item.body}</p> : null}
                  </div>
                  <div className="flex flex-wrap gap-3">
                    <ActionForm action={setAnnouncementPublished} submitLabel={item.published_at ? "Unpublish" : "Publish now"} variant="outline">
                      <input type="hidden" name="id" value={item.id} />
                      <input type="hidden" name="publish" value={item.published_at ? "false" : "true"} />
                    </ActionForm>
                    <ActionForm action={deleteAnnouncement} submitLabel="Delete" variant="ghost" confirm={`Delete "${item.title}"?`}>
                      <input type="hidden" name="id" value={item.id} />
                    </ActionForm>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <Empty>No announcements yet.</Empty>
          )}
        </Panel>
        <Panel title="New announcement">
          <ActionForm action={createAnnouncement} submitLabel="Save" pendingLabel="Saving…">
            <Field id="announcement-title" name="title" label="Title" required maxLength={160} />
            <TextAreaField id="announcement-body" name="body" label="Message" maxLength={5000} />
            <AudienceSelect id="announcement-audience" courses={courses ?? []} />
            <CheckboxField id="announcement-publish" name="publish" label="Publish now" defaultChecked />
          </ActionForm>
        </Panel>
      </AdminColumns>
    </AdminFrame>
  );
}
