import { Lock, MessageCircle } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { PageIntro } from "@/components/members/PageIntro";
import { requireMember } from "@/lib/auth";
import { community } from "@/lib/members-content";
import { createUserClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Community · The Power Shift" };

type Room = {
  id: string;
  slug: string;
  name: string;
  course_id: string | null;
  topic: string;
  is_locked: boolean;
  slow_mode_seconds: number;
  courses: { slug: string; is_published: boolean } | null;
};

export default async function ChatRoomsPage() {
  const member = await requireMember("/chat");
  const supabase = (await createUserClient())!;
  const { data } = await supabase
    .from("chat_rooms")
    .select("id, slug, name, course_id, topic, is_locked, slow_mode_seconds, courses(slug, is_published)")
    .order("created_at")
    .overrideTypes<Room[], { merge: false }>();

  // Rooms of unpublished courses stay hidden from members until the course is out.
  const rooms = (data ?? []).filter((room) => !room.course_id || room.courses?.is_published || member.isAdmin);
  const access = await Promise.all(rooms.map((room) => supabase.rpc("can_access_room", { target: room.id })));

  return (
    <div className="flex flex-col gap-10">
      <PageIntro eyebrow={community.eyebrow} title={community.title} lead={community.lead} />
      <ul className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {rooms.map((room, index) => {
          const open = access[index]?.data === true;
          const href = open ? `/chat/${room.slug}` : room.courses ? `/courses/${room.courses.slug}` : "/courses";
          return (
            <li key={room.id}>
              <Link
                href={href}
                className="group flex h-full items-start gap-4 border border-rule p-5 transition-[border-color,translate] duration-200 hover:-translate-y-0.5 hover:border-t-ink motion-reduce:hover:translate-y-0"
              >
                <span className={`grid size-11 shrink-0 place-items-center rounded-full ${open ? "bg-royal-deep text-t-cream" : "border border-rule text-fg-soft"}`}>
                  {open ? <MessageCircle aria-hidden="true" className="size-5" /> : <Lock aria-hidden="true" className="size-4" />}
                </span>
                <span className="min-w-0">
                  <span className="block font-ui text-[17px] font-semibold">{room.course_id ? room.name : community.lounge}</span>
                  {room.topic ? <span className="mt-0.5 block font-ui text-[15px] text-fg-soft">{room.topic}</span> : null}
                  <span className="t-note mt-1 block text-fg-soft">
                    {open ? community.open : room.course_id ? community.lockedCourse : community.locked}
                    {open && room.is_locked ? ` · ${community.readOnlyTag}` : ""}
                    {open && room.slow_mode_seconds ? ` · ${community.slowTag}` : ""}
                  </span>
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
