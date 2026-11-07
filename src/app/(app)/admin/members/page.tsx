import type { Metadata } from "next";
import Link from "next/link";

import { ActionForm } from "@/components/members/ActionForm";
import { listMembers } from "@/components/members/admin/admin-data";
import { AdminFrame } from "@/components/members/admin/AdminFrame";
import { Avatar } from "@/components/members/Avatar";
import { SelectField } from "@/components/members/Field";
import { Empty } from "@/components/members/PageIntro";
import { requireAdmin } from "@/lib/auth";
import { formatDate, formatDateTime } from "@/lib/format";
import { createUserClient } from "@/lib/supabase/server";

import { clearProfile, grantCourse, revokeCourse, setBanned } from "../actions";

export const metadata: Metadata = { title: "Admin · Members" };

const PER_PAGE = 50;

type Purchase = { id: string; user_id: string; course_id: string; status: string; source: string; courses: { title: string } | null };
type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export default async function AdminMembers({ searchParams }: Props) {
  const admin = await requireAdmin();
  const params = await searchParams;
  const page = Math.max(1, Number(params.page) || 1);
  const query = typeof params.q === "string" ? params.q.trim().slice(0, 80) : "";
  const supabase = (await createUserClient())!;

  const [{ data: rows, error: membersError }, { data: courses, error: coursesError }] = await Promise.all([
    listMembers(supabase, query, PER_PAGE, (page - 1) * PER_PAGE),
    supabase.from("courses").select("id, title").order("sort"),
  ]);
  const list = rows ?? [];
  const total = Number(list[0]?.total_count ?? 0);
  const first = (page - 1) * PER_PAGE + 1;
  const hasNext = first - 1 + list.length < total;
  const ids = list.map((row) => row.member_id);

  const { data: purchases, error: purchasesError } = ids.length
    ? await supabase
        .from("purchases")
        .select("id, user_id, course_id, status, source, courses(title)")
        .in("user_id", ids)
        .overrideTypes<Purchase[], { merge: false }>()
    : { data: [] as Purchase[], error: null };

  // Showing the list without its courses would offer courses members already own, so any failed read stops it.
  const error = membersError ?? coursesError ?? purchasesError;
  if (error) console.error("[admin] List members:", error.code, error.message);

  const pageLink = (target: number) => `/admin/members?page=${target}${query ? `&q=${encodeURIComponent(query)}` : ""}`;

  return (
    <AdminFrame title="Members" lead="Find someone by name or email, add a course to them by hand, or stop them posting in the community.">
      <form className="-mt-4 flex max-w-md gap-3" role="search">
        <label htmlFor="member-search" className="sr-only">
          Search by name or email
        </label>
        <input
          id="member-search"
          name="q"
          type="search"
          defaultValue={query}
          maxLength={80}
          placeholder="Search by name or email"
          className="h-11 min-w-0 flex-1 border-b-[1.5px] border-b-t-soft bg-transparent font-ui text-[16px] outline-none focus-visible:border-b-t-ink"
        />
        <button type="submit" className="masthead-link font-ui text-[15px]">
          Search
        </button>
      </form>

      {error ? (
        <Empty>Could not load members. Please refresh the page.</Empty>
      ) : list.length ? (
        <>
          <p className="t-note -mt-4 text-fg-soft">
            {first === 1 && !hasNext
              ? `${total} ${total === 1 ? "member" : "members"}`
              : `${first}–${first - 1 + list.length} of ${total} members`}
            {query ? ` matching “${query}”` : ""}
          </p>
          <ul className="divide-y divide-rule border-y border-rule">
            {list.map((member) => {
              const name = member.full_name || "Unnamed member";
              const owned = (purchases ?? []).filter((purchase) => purchase.user_id === member.member_id);
              const ownedIds = new Set(owned.filter((p) => p.status === "paid").map((p) => p.course_id));
              const available = (courses ?? []).filter((course) => !ownedIds.has(course.id as string));
              return (
                <li key={member.member_id} className="grid grid-cols-1 gap-4 py-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] lg:items-start">
                  <div className="flex min-w-0 items-start gap-3">
                    <Avatar name={member.full_name || "Member"} src={member.avatar_url} size={40} />
                    <div className="min-w-0">
                      <p className="font-ui text-[16px] font-semibold break-words">
                        {name}
                        {member.role === "admin" ? <span className="t-note ml-2 text-label">Admin</span> : null}
                        {member.banned_at ? <span className="t-note ml-2 text-red">Banned</span> : null}
                      </p>
                      <p className="t-note [overflow-wrap:anywhere] text-fg-soft">{member.email ?? "No email"}</p>
                      <p className="t-note text-fg-soft">
                        Joined {formatDate(member.joined_at)}
                        {member.attended_masterclass ? " · masterclass" : ""}
                        {" · "}
                        {member.last_sign_in_at ? `last signed in ${formatDateTime(member.last_sign_in_at)}` : "never signed in"}
                      </p>
                      {member.bio ? <p className="t-note mt-2 max-w-prose break-words whitespace-pre-line">{member.bio}</p> : null}
                    </div>
                  </div>

                  <div className="flex min-w-0 flex-col gap-2">
                    {owned.length ? (
                      <ul className="flex flex-col gap-1">
                        {owned.map((purchase) => (
                          <li key={purchase.id} className="t-note flex flex-wrap items-center gap-2">
                            <span>
                              {purchase.courses?.title}
                              <span className="text-fg-soft">
                                {" "}
                                · {purchase.status === "refunded" ? "refunded" : purchase.source === "admin" ? "added by hand" : "paid"}
                              </span>
                            </span>
                            {purchase.source === "admin" ? (
                              <ActionForm action={revokeCourse} submitLabel="Remove" variant="ghost" confirm={`Remove ${purchase.courses?.title}?`}>
                                <input type="hidden" name="id" value={purchase.id} />
                              </ActionForm>
                            ) : null}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <Empty>No courses.</Empty>
                    )}
                    {available.length ? (
                      <ActionForm action={grantCourse} submitLabel="Add course" variant="outline" className="flex-row! flex-wrap items-end gap-3!">
                        <input type="hidden" name="user_id" value={member.member_id} />
                        {/* Keeps a real width and lets the button and its message wrap below on a phone. */}
                        <SelectField id={`grant-${member.member_id}`} name="course_id" label="Add a course" className="min-w-48 flex-1 sm:max-w-xs">
                          {available.map((course) => (
                            <option key={course.id} value={course.id}>
                              {course.title}
                            </option>
                          ))}
                        </SelectField>
                      </ActionForm>
                    ) : null}
                  </div>

                  {member.member_id === admin.id || member.role === "admin" ? null : (
                    <div className="flex flex-col gap-3">
                      <ActionForm
                        action={setBanned}
                        submitLabel={member.banned_at ? "Let them post again" : "Stop them posting"}
                        variant="outline"
                        confirm={member.banned_at ? undefined : `Stop ${member.full_name || "this member"} posting in the community?`}
                      >
                        <input type="hidden" name="user_id" value={member.member_id} />
                        <input type="hidden" name="banned" value={member.banned_at ? "false" : "true"} />
                      </ActionForm>
                      {member.full_name || member.bio || member.avatar_url ? (
                        <ActionForm
                          action={clearProfile}
                          submitLabel="Clear name, bio and photo"
                          variant="ghost"
                          confirm={`Clear ${member.full_name || "this member"}'s name, bio and photo? They can set them again unless they're stopped from posting.`}
                        >
                          <input type="hidden" name="user_id" value={member.member_id} />
                        </ActionForm>
                      ) : null}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </>
      ) : (
        <Empty>{query ? `No members match “${query}”.` : "No members found."}</Empty>
      )}

      <nav aria-label="Pages" className="t-note flex gap-6">
        {page > 1 ? <Link href={pageLink(page - 1)}>← Newer</Link> : null}
        {hasNext ? <Link href={pageLink(page + 1)}>Older →</Link> : null}
      </nav>
    </AdminFrame>
  );
}
