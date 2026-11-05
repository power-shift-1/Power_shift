import type { Metadata } from "next";
import Link from "next/link";

import { ActionForm } from "@/components/members/ActionForm";
import { AdminFrame } from "@/components/members/admin/AdminFrame";
import { SelectField } from "@/components/members/Field";
import { Empty, Panel } from "@/components/members/PageIntro";
import { requireAdmin } from "@/lib/auth";
import { formatDateTime } from "@/lib/format";
import { community } from "@/lib/members-content";
import { createUserClient } from "@/lib/supabase/server";

import { closeReport, deleteChatMessage, muteReported } from "../actions";

export const metadata: Metadata = { title: "Admin · Reports" };

type Report = {
  id: string;
  reporter_id: string;
  reason: string;
  status: "open" | "resolved" | "dismissed";
  created_at: string;
  resolved_at: string | null;
  chat_messages: {
    id: number;
    user_id: string;
    author_name: string;
    body: string;
    created_at: string;
    chat_rooms: { slug: string; name: string; course_id: string | null } | null;
  } | null;
};

const FIELDS = "id, reporter_id, reason, status, created_at, resolved_at, chat_messages(id, user_id, author_name, body, created_at, chat_rooms(slug, name, course_id))";

export default async function AdminReports() {
  await requireAdmin();
  const supabase = (await createUserClient())!;
  const [{ data: open }, { data: closed }] = await Promise.all([
    supabase.from("chat_reports").select(FIELDS).eq("status", "open").order("created_at", { ascending: false }).overrideTypes<Report[], { merge: false }>(),
    supabase
      .from("chat_reports")
      .select(FIELDS)
      .neq("status", "open")
      .order("resolved_at", { ascending: false })
      .limit(20)
      .overrideTypes<Report[], { merge: false }>(),
  ]);

  const reporterIds = [...new Set([...(open ?? []), ...(closed ?? [])].map((report) => report.reporter_id))];
  const { data: names } = reporterIds.length ? await supabase.from("profiles").select("id, full_name").in("id", reporterIds) : { data: [] };
  const nameOf = new Map((names ?? []).map((row) => [row.id as string, (row.full_name as string) || "Member"]));
  const roomLabel = (room: { name: string; course_id: string | null } | null | undefined) => (room ? (room.course_id ? room.name : community.lounge) : "a room");

  return (
    <AdminFrame title="Reports" lead="Messages members have flagged. Removing a message also clears its reports.">
      <Panel title={`Open (${open?.length ?? 0})`}>
        {open?.length ? (
          <ul className="flex flex-col gap-5">
            {open.map((report) => {
              const message = report.chat_messages;
              return (
                <li key={report.id} className="border border-rule p-5">
                  <p className="t-note text-fg-soft">
                    Reported by {nameOf.get(report.reporter_id) ?? "a member"} · {formatDateTime(report.created_at)}
                  </p>
                  {report.reason ? <p className="mt-1 font-ui text-[15px]">“{report.reason}”</p> : null}
                  {message ? (
                    <blockquote className="mt-4 border-l-[3px] border-l-red pl-4">
                      <p className="t-note text-fg-soft">
                        <span className="font-semibold text-fg">{message.author_name}</span> in{" "}
                        {message.chat_rooms ? (
                          <Link href={`/chat/${message.chat_rooms.slug}#message-${message.id}`} className="underline underline-offset-4">
                            {roomLabel(message.chat_rooms)}
                          </Link>
                        ) : (
                          roomLabel(null)
                        )}{" "}
                        · {formatDateTime(message.created_at)}
                      </p>
                      <p className="mt-1 font-ui text-[16px] break-words whitespace-pre-wrap">{message.body}</p>
                    </blockquote>
                  ) : null}
                  <div className="mt-5 flex flex-wrap items-end gap-3">
                    {message ? (
                      <>
                        <ActionForm action={deleteChatMessage} submitLabel="Remove message" confirm={community.removeConfirm}>
                          <input type="hidden" name="id" value={message.id} />
                        </ActionForm>
                        <ActionForm action={muteReported} submitLabel="Mute author" variant="outline" className="flex-row! items-end gap-3!">
                          <input type="hidden" name="message_id" value={message.id} />
                          <SelectField id={`mute-${report.id}`} name="minutes" label="For" defaultValue="1440" className="min-w-40">
                            {community.muteOptions.map((option) => (
                              <option key={option.minutes} value={option.minutes}>
                                {option.short}
                              </option>
                            ))}
                          </SelectField>
                        </ActionForm>
                      </>
                    ) : null}
                    <ActionForm action={closeReport} submitLabel="Dismiss" variant="ghost">
                      <input type="hidden" name="id" value={report.id} />
                      <input type="hidden" name="status" value="dismissed" />
                    </ActionForm>
                  </div>
                </li>
              );
            })}
          </ul>
        ) : (
          <Empty>No open reports.</Empty>
        )}
      </Panel>

      <Panel title="Recently closed">
        {closed?.length ? (
          <ul className="divide-y divide-rule border-y border-rule">
            {closed.map((report) => (
              <li key={report.id} className="py-3 font-ui text-[15px]">
                <span className="font-semibold">{report.chat_messages?.author_name ?? "Removed message"}</span>
                <span className="text-fg-soft">
                  {" "}
                  · {report.status === "resolved" ? "dealt with" : "dismissed"}
                  {report.resolved_at ? ` · ${formatDateTime(report.resolved_at)}` : ""}
                </span>
                {report.chat_messages ? <span className="t-note line-clamp-1 block text-fg-soft">{report.chat_messages.body}</span> : null}
              </li>
            ))}
          </ul>
        ) : (
          <Empty>Nothing closed yet.</Empty>
        )}
      </Panel>
    </AdminFrame>
  );
}
