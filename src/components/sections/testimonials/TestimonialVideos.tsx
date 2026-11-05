import { testimonials } from "@/lib/content";
import { VideoPoster } from "./VideoPoster";

const YOUTUBE_ID = /^[A-Za-z0-9_-]{11}$/;

/** The video testimonials that have a YouTube ID. Until one does, this renders nothing. */
export function TestimonialVideos() {
  // A pasted link or a typo is skipped rather than shown as a broken poster.
  const videos = testimonials.videos.flatMap((video) =>
    video.youtubeId && YOUTUBE_ID.test(video.youtubeId)
      ? [{ name: video.name, id: video.youtubeId }]
      : [],
  );
  if (videos.length === 0) return null;

  return (
    <div className="mt-20 lg:mt-28">
      <h3 className="t-h3 text-[length:clamp(1.75rem,1.2rem+2vw,3rem)]">
        {testimonials.videosTitle}
      </h3>
      <ul className="mt-8 grid grid-cols-1 gap-[var(--gap)] gap-y-8 sm:grid-cols-2 lg:mt-12 xl:grid-cols-3">
        {videos.map((video) => (
          <li key={video.id}>
            <figure>
              <VideoPoster
                id={video.id}
                label={`${testimonials.videoPlay}: ${video.name}`}
                title={`${testimonials.videoFrameTitle}: ${video.name}`}
              />
              <figcaption className="t-note mt-3 font-semibold">{video.name}</figcaption>
            </figure>
          </li>
        ))}
      </ul>
    </div>
  );
}
