import type { ReactNode } from "react";

import { MemberNav } from "@/components/members/MemberNav";
import { PageIntro } from "@/components/members/PageIntro";

const ADMIN_NAV = [
  { href: "/admin/overview", label: "Overview" },
  { href: "/admin/courses", label: "Courses" },
  { href: "/admin/announcements", label: "Announcements" },
  { href: "/admin/sessions", label: "Live sessions" },
  { href: "/admin/members", label: "Members" },
  { href: "/admin/chat", label: "Chat" },
  { href: "/admin/reports", label: "Reports" },
];

/** Rendered by each admin page after it has checked the role, so other members never see the admin menu. */
export function AdminFrame({ title, lead, children }: { title: string; lead?: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-10">
      <PageIntro eyebrow="Admin" title={title} lead={lead} />
      <div className="-mt-6 border-b border-rule">
        <MemberNav items={ADMIN_NAV} label="Admin sections" />
      </div>
      {children}
    </div>
  );
}

/** A two-column admin row: what exists, and the form to add more. */
export function AdminColumns({ children }: { children: ReactNode }) {
  return <div className="grid grid-cols-1 gap-12 lg:grid-cols-[minmax(0,1fr)_420px]">{children}</div>;
}
