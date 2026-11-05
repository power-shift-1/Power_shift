"use client";

import { Upload } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";

import { addFileResource } from "@/app/(app)/admin/actions";
import { FormMessage } from "@/components/members/FormMessage";
import { Button } from "@/components/ui/button";
import { getBrowserClient } from "@/lib/supabase/browser";

const MAX_BYTES = 50 * 1024 * 1024;

/** Keeps the extension and a readable name, and drops anything a storage path shouldn't contain. */
function safeName(name: string) {
  const dot = name.lastIndexOf(".");
  const base = (dot > 0 ? name.slice(0, dot) : name).normalize("NFKD").replace(/\p{M}/gu, "").replace(/[^A-Za-z0-9-]+/g, "-").replace(/^-+|-+$/g, "");
  const extension = dot > 0 ? name.slice(dot + 1).replace(/[^A-Za-z0-9]/g, "").slice(0, 10) : "";
  return `${(base || "file").slice(0, 80)}${extension ? `.${extension}` : ""}`;
}

/**
 * Uploads straight from the browser into the private lesson-resources bucket, so large files never pass
 * through the site's server. Storage policies only let admins write there.
 */
export function ResourceUploader({ lessonId }: { lessonId: string }) {
  const router = useRouter();
  const file = useRef<HTMLInputElement>(null);
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, startTransition] = useTransition();

  function upload() {
    const chosen = file.current?.files?.[0];
    if (!chosen) return setMessage({ ok: false, text: "Please choose a file." });
    if (chosen.size > MAX_BYTES) return setMessage({ ok: false, text: "Files can be up to 50 MB." });
    const supabase = getBrowserClient();
    if (!supabase) return setMessage({ ok: false, text: "Storage isn't set up." });

    setMessage(null);
    startTransition(async () => {
      const path = `${lessonId}/${Date.now().toString(36)}-${safeName(chosen.name)}`;
      const { error } = await supabase.storage.from("lesson-resources").upload(path, chosen, { contentType: chosen.type || undefined });
      if (error) {
        setMessage({ ok: false, text: `Upload failed: ${error.message}` });
        return;
      }
      const result = await addFileResource({ lessonId, title: title.trim() || chosen.name, path, size: chosen.size });
      setMessage({ ok: Boolean(result.ok), text: result.message ?? "" });
      if (result.ok) {
        setTitle("");
        if (file.current) file.current.value = "";
        router.refresh();
      } else {
        // The record failed, so don't leave an orphaned file behind.
        await supabase.storage.from("lesson-resources").remove([path]);
      }
    });
  }

  return (
    <div className="flex flex-col gap-3">
      <label htmlFor={`file-title-${lessonId}`} className="font-ui text-[15px] font-medium">
        File title
      </label>
      <input
        id={`file-title-${lessonId}`}
        value={title}
        onChange={(event) => setTitle(event.target.value)}
        maxLength={160}
        placeholder="Workbook (PDF)"
        className="h-11 border-0 border-b-[1.5px] border-b-t-soft bg-transparent font-ui text-[16px] outline-none focus-visible:border-b-t-ink"
      />
      <input ref={file} type="file" aria-label="File to upload" className="font-ui text-[14px] file:mr-3 file:border file:border-rule file:bg-transparent file:px-3 file:py-2 file:font-ui" />
      <div className="flex flex-wrap items-center gap-4">
        <Button type="button" variant="outline" size="default" onClick={upload} aria-busy={pending || undefined} disabled={pending}>
          <Upload aria-hidden="true" />
          <span>{pending ? "Uploading…" : "Upload file"}</span>
        </Button>
        {message?.text ? <FormMessage tone={message.ok ? "ok" : "error"}>{message.text}</FormMessage> : null}
      </div>
    </div>
  );
}
