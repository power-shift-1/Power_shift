import Image from "next/image";
import { Eyebrow } from "@/components/shared/Eyebrow";
import { Frame } from "@/components/shared/Frame";
import { Reveal } from "@/components/shared/Reveal";
import { Stock } from "@/components/shared/Stock";
import { awards, testimonials } from "@/lib/content";
import { emphasise, Monogram, NoteCard } from "./testimonials/NoteCard";
import { TestimonialVideos } from "./testimonials/TestimonialVideos";

export function Testimonials() {
  const featured = testimonials.featured;
  return (
    <>
      <Stock id="stories" stock="paper" aria-labelledby="stories-title" className="py-[var(--section)]">
        <Frame>
          <header className="max-w-4xl">
            <Eyebrow dash>{testimonials.eyebrow}</Eyebrow>
            <Reveal
              as="h2"
              id="stories-title"
              y={18}
              duration={800}
              className="t-h2 mt-4 text-[length:clamp(2.25rem,1.1rem+3.4vw,4.5rem)]"
            >
              {testimonials.title} <em className="block">{testimonials.titleAccent}</em>
            </Reveal>
            <p className="t-body mt-6 text-fg-soft">{testimonials.lead}</p>
          </header>

          <figure className="mt-14 border-t-[1.5px] border-t-gold-line pt-10 lg:mt-20 lg:grid lg:grid-cols-12 lg:gap-x-[var(--gap)]">
            <Reveal as="blockquote" mode="fade" duration={700} className="lg:col-[1/span_9]">
              <p className="t-standfirst text-t-royal italic">{featured.quote}</p>
            </Reveal>
            <figcaption className="mt-6 flex items-center gap-3 lg:col-[10/span_3] lg:mt-0 lg:self-end">
              <Monogram initials={featured.note.monogram} />
              <span className="t-note">
                <span className="block font-semibold">{featured.note.name}</span>
                {featured.note.detail ? <span className="block text-fg-soft">{featured.note.detail}</span> : null}
              </span>
            </figcaption>
            {/* The pull quote is cut, so the whole note stays one click away. */}
            <details className="group mt-6 lg:col-[1/span_9]">
              <summary className="inline-flex min-h-11 cursor-pointer list-none items-center font-ui text-[0.9375rem] font-semibold text-accent underline-offset-4 hover:underline [&::-webkit-details-marker]:hidden">
                {featured.fullNote}
              </summary>
              <blockquote className="mt-3 max-w-[68ch] space-y-4 font-text text-[1.125rem] leading-[1.6] text-fg-soft">
                {featured.note.paragraphs.map((paragraph) => (
                  <p key={paragraph}>{emphasise(paragraph, featured.note.emphasis)}</p>
                ))}
              </blockquote>
            </details>
          </figure>

          {/* Columns give the wall its uneven rhythm, as notes vary a lot in length. */}
          <ul className="mt-16 columns-1 gap-x-[var(--gap)] md:columns-2 lg:mt-24 xl:columns-3">
            {testimonials.notes.map((note, index) => (
              <li key={`${note.name}-${index}`} className="mb-[var(--gap)] break-inside-avoid">
                <NoteCard note={note} />
              </li>
            ))}
          </ul>

          <TestimonialVideos />
        </Frame>
      </Stock>

      <Stock stock="ink" aria-labelledby="awards-title" className="py-[var(--section)]">
        <Frame className="grid gap-12 lg:grid-cols-12 lg:gap-x-[var(--gap)]">
          <header className="lg:col-[1/span_4] lg:self-center">
            <Eyebrow dash>{awards.eyebrow}</Eyebrow>
            <Reveal as="h2" id="awards-title" y={18} duration={800} className="t-h3 mt-4">
              {awards.title}
            </Reveal>
            <p className="t-body mt-6 text-fg-soft">{awards.lead}</p>
          </header>
          <ul className="grid grid-cols-1 gap-[var(--gap)] sm:grid-cols-2 lg:col-[6/span_7]">
            {awards.items.map((item) => (
              <li key={item.src}>
                <figure>
                  <div className="relative overflow-hidden border border-[color-mix(in_oklch,var(--gold-line),transparent_40%)]">
                    <Image
                      src={item.src}
                      alt={item.alt}
                      width={item.width}
                      height={item.height}
                      sizes="(min-width: 1024px) 28vw, (min-width: 640px) 45vw, 92vw"
                      className="h-auto w-full"
                    />
                  </div>
                  <figcaption className="t-note mt-3 text-fg-soft">{item.caption}</figcaption>
                </figure>
              </li>
            ))}
          </ul>
        </Frame>
      </Stock>
    </>
  );
}
