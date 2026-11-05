"use client";

import { cn } from "cn";
import { ChevronDown } from "lucide-react";
import { useEffect, useId, useRef, useState, type ReactNode } from "react";

// SHOWN_LINES matches max-h-[7lh] in CLAMP. A note only clamps if that hides two lines or more.
const SHOWN_LINES = 7;
const MIN_HIDDEN_LINES = 2;

const CLAMP =
  "data-long:not-data-open:max-h-[7lh] data-long:not-data-open:overflow-hidden data-long:not-data-open:[mask-image:linear-gradient(to_bottom,#000_calc(100%_-_2lh),transparent)]";

type ClampedQuoteProps = {
  /** Whose note it is, so each button makes sense to a screen reader out of context. */
  name: string;
  more: string;
  less: string;
  className?: string;
  children: ReactNode;
};

/**
 * A blockquote that clamps a long note behind a Read more button. Like Reveal, server HTML is the
 * whole note, and only notes still below the viewport after hydration clamp, so failed JS hides nothing.
 * Screen readers always get the whole note; the clamp is visual.
 */
export function ClampedQuote({ name, more, less, className, children }: ClampedQuoteProps) {
  const quote = useRef<HTMLQuoteElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const id = useId();

  useEffect(() => {
    const element = quote.current;
    if (!element) return;
    if (element.getBoundingClientRect().top < window.innerHeight) return;

    // scrollHeight is the whole note, clamped or not, so measuring never fights the clamp.
    const measure = () => {
      const line = parseFloat(getComputedStyle(element).lineHeight);
      element.toggleAttribute(
        "data-long",
        element.scrollHeight > line * (SHOWN_LINES + MIN_HIDDEN_LINES),
      );
    };
    measure();
    window.addEventListener("resize", measure);
    return () => {
      window.removeEventListener("resize", measure);
      element.removeAttribute("data-long");
    };
  }, []);

  const toggle = () => {
    setOpen(!open);
    // Closing a long note can leave the button above the viewport, so bring it back.
    if (open) requestAnimationFrame(() => button.current?.scrollIntoView({ block: "nearest" }));
  };

  return (
    <>
      <blockquote
        ref={quote}
        id={id}
        data-open={open ? "" : undefined}
        className={cn("peer", CLAMP, className)}
      >
        {children}
      </blockquote>
      <button
        ref={button}
        type="button"
        aria-expanded={open}
        aria-controls={id}
        onClick={toggle}
        className="mt-2 hidden min-h-11 items-center gap-1.5 self-start font-ui text-[0.9375rem] font-semibold text-accent underline-offset-4 hover:underline peer-data-long:inline-flex"
      >
        {open ? less : more}
        <span className="sr-only">: {name}</span>
        <ChevronDown
          aria-hidden="true"
          strokeWidth={1.75}
          className={cn(
            "size-4 transition-transform duration-200 ease-out motion-reduce:transition-none",
            open && "rotate-180",
          )}
        />
      </button>
    </>
  );
}
