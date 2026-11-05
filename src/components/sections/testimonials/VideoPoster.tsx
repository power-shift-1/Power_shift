"use client";

import { Play } from "lucide-react";
import { useEffect, useRef, useState, type MouseEvent } from "react";

type VideoPosterProps = {
  /** An 11-character YouTube ID. */
  id: string;
  /** The link's accessible name. */
  label: string;
  /** The player's title, for screen readers. */
  title: string;
};

/**
 * A YouTube poster that turns into the player when clicked, so nothing from YouTube but the
 * poster image loads until then. Without JS, or with a modifier key, the link opens YouTube.
 */
export function VideoPoster({ id, label, title }: VideoPosterProps) {
  const [playing, setPlaying] = useState(false);
  const frame = useRef<HTMLIFrameElement>(null);

  // The focused link is gone once the player replaces it, so focus follows to the player.
  useEffect(() => {
    if (playing) frame.current?.focus();
  }, [playing]);

  const play = (event: MouseEvent<HTMLAnchorElement>) => {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    setPlaying(true);
  };

  return (
    <div className="relative aspect-video overflow-hidden bg-ink">
      {playing ? (
        <iframe
          ref={frame}
          src={`https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0&playsinline=1`}
          title={title}
          allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
          allowFullScreen
          referrerPolicy="strict-origin-when-cross-origin"
          className="absolute inset-0 size-full"
        />
      ) : (
        <a
          href={`https://www.youtube.com/watch?v=${id}`}
          onClick={play}
          className="group absolute inset-0 block"
        >
          {/* eslint-disable-next-line @next/next/no-img-element -- a remote poster, and next.config allows no remote images */}
          <img
            src={`https://i.ytimg.com/vi/${id}/hqdefault.jpg`}
            alt=""
            loading="lazy"
            decoding="async"
            className="size-full object-cover"
          />
          <span
            aria-hidden="true"
            className="absolute inset-0 grid place-items-center bg-ink/20 transition-colors duration-200 group-hover:bg-ink/35"
          >
            <span className="flex size-16 items-center justify-center rounded-full bg-paper text-t-ink shadow-[0_10px_30px_rgb(14_15_18/.35)] transition-transform duration-200 ease-out group-hover:scale-105 motion-reduce:group-hover:scale-100">
              <Play strokeWidth={1.5} className="ml-1 size-6 fill-current" />
            </span>
          </span>
          <span className="sr-only">{label}</span>
        </a>
      )}
    </div>
  );
}
