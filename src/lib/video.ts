export type VideoRef = {
  provider: "youtube" | "vimeo";
  videoId: string;
  /** The h= part of a private Vimeo link. */
  vimeoHash: string | null;
};

const YOUTUBE_ID = /^[A-Za-z0-9_-]{11}$/;
const VIMEO_ID = /^\d{1,12}$/;
const VIMEO_HASH = /^[0-9a-f]{6,32}$/;

/** Reads the video from a pasted YouTube or Vimeo link, or returns null if it isn't one. */
export function parseVideoUrl(input: string): VideoRef | null {
  let url: URL;
  try {
    url = new URL(input.trim());
  } catch {
    return null;
  }
  const host = url.hostname.replace(/^(www|m)\./, "");
  const parts = url.pathname.split("/").filter(Boolean);

  if (host === "youtu.be" || host === "youtube.com" || host === "youtube-nocookie.com") {
    const id =
      host === "youtu.be"
        ? parts[0]
        : parts[0] === "watch"
          ? url.searchParams.get("v")
          : ["embed", "shorts", "live", "v"].includes(parts[0] ?? "")
            ? parts[1]
            : null;
    return id && YOUTUBE_ID.test(id) ? { provider: "youtube", videoId: id, vimeoHash: null } : null;
  }

  if (host === "vimeo.com" || host === "player.vimeo.com") {
    const [id, pathHash] = host === "player.vimeo.com" && parts[0] === "video" ? parts.slice(1) : parts;
    const hash = url.searchParams.get("h") ?? pathHash ?? null;
    if (!id || !VIMEO_ID.test(id)) return null;
    if (hash && !VIMEO_HASH.test(hash)) return null;
    return { provider: "vimeo", videoId: id, vimeoHash: hash };
  }

  return null;
}

/** The player address for an embed. YouTube's no-cookie domain sets no tracking cookies until play. */
export function embedSrc(video: VideoRef) {
  if (video.provider === "youtube") {
    return `https://www.youtube-nocookie.com/embed/${video.videoId}?rel=0&modestbranding=1`;
  }
  const hash = video.vimeoHash ? `h=${video.vimeoHash}&` : "";
  return `https://player.vimeo.com/video/${video.videoId}?${hash}dnt=1&title=0&byline=0&portrait=0`;
}

/** The link an admin would paste, rebuilt from the stored parts, for the edit form. */
export function watchUrl(video: VideoRef) {
  if (video.provider === "youtube") return `https://www.youtube.com/watch?v=${video.videoId}`;
  return `https://vimeo.com/${video.videoId}${video.vimeoHash ? `/${video.vimeoHash}` : ""}`;
}
