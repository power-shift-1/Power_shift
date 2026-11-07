/** A course's cover picture, or a plain royal panel with its title. Decorative: the title is always written beside it. */
export function CourseCover({ title, src }: { title: string; src: string | null }) {
  return (
    <div aria-hidden="true" className="relative aspect-[16/9] overflow-hidden bg-royal-deep">
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt="" loading="lazy" className="size-full object-cover transition-transform duration-500 group-hover:scale-[1.02]" />
      ) : (
        <div data-stock="royal" className="flex size-full items-end p-5">
          <span className="font-display text-[1.75rem] leading-[1.1] text-t-cream">{title}</span>
        </div>
      )}
      <span aria-hidden="true" className="absolute inset-x-0 bottom-0 h-[3px] bg-gold-line" />
    </div>
  );
}
