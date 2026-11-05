/**
 * The placeholder every member page shows while its session-dependent content streams in.
 * Each page folder has a loading.tsx that re-exports this: on a client navigation only the part
 * below the shared layout re-renders, so a boundary higher up would not cover the switch.
 */
export function PageLoading() {
  return (
    <div aria-busy="true" aria-label="Loading" className="animate-pulse motion-reduce:animate-none">
      <div className="h-4 w-32 bg-rule" />
      <div className="mt-5 h-12 w-2/3 max-w-xl bg-rule" />
      <div className="mt-10 grid gap-6 md:grid-cols-2">
        <div className="h-40 bg-rule" />
        <div className="h-40 bg-rule" />
      </div>
    </div>
  );
}

/** The sign-in pages' smaller placeholder. */
export function FormLoading() {
  return (
    <div aria-busy="true" aria-label="Loading" className="animate-pulse motion-reduce:animate-none">
      <div className="h-4 w-24 bg-rule" />
      <div className="mt-5 h-12 w-3/4 bg-rule" />
      <div className="mt-10 h-12 bg-rule" />
      <div className="mt-5 h-12 bg-rule" />
    </div>
  );
}
