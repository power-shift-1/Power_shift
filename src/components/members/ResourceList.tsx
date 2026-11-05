import { Download, ExternalLink, FileText } from "lucide-react";
import type { SupabaseClient } from "@supabase/supabase-js";

import { courses as copy } from "@/lib/members-content";

type Resource = { id: string; title: string; kind: "file" | "link"; url: string | null; storage_path: string | null; size_bytes: number | null };

const SIGNED_URL_SECONDS = 30 * 60;

function size(bytes: number | null) {
  if (!bytes) return null;
  return bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * A lesson's worksheets and links. Row level security returns nothing for a locked lesson, and the
 * storage policy only signs files for members who may watch it, so these links can't be guessed or shared for long.
 */
export async function ResourceList({ supabase, lessonId }: { supabase: SupabaseClient; lessonId: string }) {
  const { data } = await supabase
    .from("lesson_resources")
    .select("id, title, kind, url, storage_path, size_bytes")
    .eq("lesson_id", lessonId)
    .order("sort")
    .order("created_at")
    .overrideTypes<Resource[], { merge: false }>();
  if (!data?.length) return null;

  const paths = data.flatMap((resource) => (resource.kind === "file" && resource.storage_path ? [resource.storage_path] : []));
  const signed = paths.length
    ? (await supabase.storage.from("lesson-resources").createSignedUrls(paths, SIGNED_URL_SECONDS, { download: true })).data ?? []
    : [];
  const hrefFor = new Map(signed.flatMap((item) => (item.path && item.signedUrl ? [[item.path, item.signedUrl] as const] : [])));

  return (
    <section className="mt-10">
      <h2 className="t-eyebrow">{copy.resourcesTitle}</h2>
      <ul className="mt-3 divide-y divide-rule border-y border-rule">
        {data.map((resource) => {
          const href = resource.kind === "link" ? resource.url : resource.storage_path ? hrefFor.get(resource.storage_path) : null;
          const Icon = resource.kind === "link" ? ExternalLink : Download;
          return (
            <li key={resource.id} className="flex items-center justify-between gap-4 py-3">
              <span className="flex min-w-0 items-center gap-3">
                <FileText aria-hidden="true" className="size-5 shrink-0 text-label" />
                <span className="min-w-0">
                  <span className="block truncate font-ui text-[16px] font-semibold">{resource.title}</span>
                  {size(resource.size_bytes) ? <span className="t-note text-fg-soft">{size(resource.size_bytes)}</span> : null}
                </span>
              </span>
              {href ? (
                <a
                  href={href}
                  {...(resource.kind === "link" ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                  className="t-note inline-flex min-h-11 shrink-0 items-center gap-2 border border-rule px-4 font-semibold hover:border-t-ink"
                >
                  <Icon aria-hidden="true" className="size-4" />
                  {resource.kind === "link" ? copy.openLink : copy.download}
                </a>
              ) : (
                <span className="t-note text-fg-soft">{copy.resourceUnavailable}</span>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
