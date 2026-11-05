"use client";

import { Camera } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";

import { saveAvatar } from "@/app/(app)/account/actions";
import { Button } from "@/components/ui/button";
import { account } from "@/lib/members-content";
import { getBrowserClient } from "@/lib/supabase/browser";

import { Avatar } from "./Avatar";
import { FormMessage } from "./FormMessage";

const TYPES: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };
const MAX_BYTES = 2 * 1024 * 1024;

/** Uploads straight from the browser into the member's own folder; storage policies refuse any other folder. */
export function AvatarUpload({ memberId, name, src }: { memberId: string; name: string; src: string | null }) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ tone: "ok" | "error"; text: string } | null>(null);

  function upload(file: File) {
    const extension = TYPES[file.type];
    if (!extension) return setMessage({ tone: "error", text: account.photoWrongType });
    if (file.size > MAX_BYTES) return setMessage({ tone: "error", text: account.photoTooBig });
    const supabase = getBrowserClient();
    if (!supabase) return setMessage({ tone: "error", text: account.photoFailed });

    setMessage(null);
    startTransition(async () => {
      // A new name each time, so browsers and CDNs never show the old picture from cache.
      const path = `${memberId}/${Date.now().toString(36)}.${extension}`;
      const { error } = await supabase.storage.from("avatars").upload(path, file, { contentType: file.type, cacheControl: "31536000" });
      const url = error ? null : supabase.storage.from("avatars").getPublicUrl(path).data.publicUrl;
      const saved = url ? await saveAvatar(url) : { ok: false };
      setMessage(saved.ok ? { tone: "ok", text: account.photoSaved } : { tone: "error", text: account.photoFailed });
      if (saved.ok) router.refresh();
    });
  }

  function remove() {
    startTransition(async () => {
      const saved = await saveAvatar(null);
      if (saved.ok) router.refresh();
      else setMessage({ tone: "error", text: account.photoFailed });
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-5">
      <Avatar name={name} src={src} size={72} />
      <div className="flex flex-col gap-2">
        <p className="font-ui text-[15px] font-medium">{account.photo}</p>
        <div className="flex flex-wrap gap-3">
          <Button type="button" variant="reserve-quiet" size="default" onClick={() => input.current?.click()} aria-busy={pending || undefined}>
            <Camera aria-hidden="true" />
            <span>{pending ? account.photoUploading : account.photoChange}</span>
          </Button>
          {src ? (
            <Button type="button" variant="ghost" size="default" onClick={remove} disabled={pending} className="font-ui">
              {account.photoRemove}
            </Button>
          ) : null}
        </div>
        <p className="t-note text-fg-soft">{account.photoHint}</p>
        {message ? <FormMessage tone={message.tone}>{message.text}</FormMessage> : null}
      </div>
      <input
        ref={input}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="sr-only"
        tabIndex={-1}
        aria-hidden="true"
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = "";
          if (file) upload(file);
        }}
      />
    </div>
  );
}
