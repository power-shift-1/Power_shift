import { cn } from "cn";
import { Quote } from "lucide-react";
import type { ReactNode } from "react";
import { testimonials } from "@/lib/content";
import { ClampedQuote } from "./ClampedQuote";

type Note = (typeof testimonials.notes)[number];

/** Wraps each phrase the client emphasised in an em, searching in order so the wording stays untouched. */
export function emphasise(text: string, phrases: readonly string[] = []) {
  const parts: ReactNode[] = [];
  let rest = text;
  for (const phrase of phrases) {
    const at = rest.indexOf(phrase);
    if (at === -1) continue;
    parts.push(rest.slice(0, at), <em key={phrase}>{phrase}</em>);
    rest = rest.slice(at + phrase.length);
  }
  parts.push(rest);
  return parts;
}

/** Initials in place of a photo. A note with no name gets a quotation mark. */
export function Monogram({ initials, className }: { initials: string | null; className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "t-note flex size-10 flex-none items-center justify-center rounded-full bg-gold-line font-semibold text-t-ink",
        className,
      )}
    >
      {initials ?? <Quote strokeWidth={1.75} className="size-4" />}
    </span>
  );
}

export function NoteCard({ note }: { note: Note }) {
  return (
    <figure className="flex h-full flex-col bg-bone p-[clamp(24px,2.4vw,36px)]">
      <span
        aria-hidden="true"
        className="block h-[0.5em] font-display text-[3.5rem] leading-none text-gold-shape"
      >
        “
      </span>
      <div className="mt-4 flex flex-col pb-6">
        <ClampedQuote
          name={note.name}
          more={testimonials.readMore}
          less={testimonials.readLess}
          className="space-y-4 font-text text-[length:clamp(1.125rem,1.07rem+0.25vw,1.25rem)] leading-[1.55] text-pretty"
        >
          {note.paragraphs.map((paragraph) => (
            <p key={paragraph}>{emphasise(paragraph, note.emphasis)}</p>
          ))}
        </ClampedQuote>
      </div>
      <figcaption className="mt-auto flex items-start gap-3 border-t pt-5">
        <Monogram initials={note.monogram} />
        <span className="t-note min-w-0 text-pretty">
          <span className="block font-semibold">{note.name}</span>
          {note.detail ? <span className="block text-fg-soft">{note.detail}</span> : null}
          {note.source ? <span className="mt-1 block text-fg-soft">{note.source}</span> : null}
        </span>
      </figcaption>
    </figure>
  );
}
