import { Download, ExternalLink, FileText } from "lucide-react";
import type { SupabaseClient } from "@supabase/supabase-js";

import { courses as copy } from "@/lib/members-content";

type Resource = { id: string; title: string; kind: "file" | "link"; size_bytes: number | null };

function size(bytes: number | null) {
  if (!bytes) return null;
  return bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * A lesson's worksheets and links. Row level security returns nothing for a locked lesson. Each button
 * goes through /api/resources/<id>, which checks access again and signs file links at the moment of the click.
 */
export async function ResourceList({ supabase, lessonId, from }: { supabase: SupabaseClient; lessonId: string; from: string }) {
  const { data } = await supabase
    .from("lesson_resources")
    .select("id, title, kind, size_bytes")
    .eq("lesson_id", lessonId)
    .order("sort")
    .order("created_at")
    .overrideTypes<Resource[], { merge: false }>();
  if (!data?.length) return null;

  return (
    <section className="mt-10">
      <h2 className="t-eyebrow">{copy.resourcesTitle}</h2>
      <ul className="mt-3 divide-y divide-rule border-y border-rule">
        {data.map((resource) => {
          const isLink = resource.kind === "link";
          const Icon = isLink ? ExternalLink : Download;
          return (
            <li key={resource.id} className="flex items-center justify-between gap-4 py-3">
              <span className="flex min-w-0 items-center gap-3">
                <FileText aria-hidden="true" className="size-5 shrink-0 text-label" />
                <span className="min-w-0">
                  <span className="block font-ui text-[16px] font-semibold break-words">{resource.title}</span>
                  {size(resource.size_bytes) ? <span className="t-note text-fg-soft">{size(resource.size_bytes)}</span> : null}
                </span>
              </span>
              <a
                href={`/api/resources/${resource.id}?from=${encodeURIComponent(from)}`}
                {...(isLink ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                aria-label={`${isLink ? copy.openLink : copy.download}: ${resource.title}`}
                className="t-note inline-flex min-h-11 shrink-0 items-center gap-2 border border-rule px-4 font-semibold hover:border-t-ink"
              >
                <Icon aria-hidden="true" className="size-4" />
                {isLink ? copy.openLink : copy.download}
              </a>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
