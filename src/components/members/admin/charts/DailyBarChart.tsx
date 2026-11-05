import { cn } from "cn";

export type DailyBar = {
  /** YYYY-MM-DD, already in India's time zone. */
  day: string;
  value: number;
  /** The value alone, for the label on the busiest day: "₹9,998". */
  label: string;
  /** The value in words, for the hover title and the summary: "₹9,998 from 2 courses". */
  detail: string;
  /** The table's cells after the date. */
  cells: string[];
};

type DailyBarChartProps = {
  id: string;
  title: string;
  /** The period's total in words: "42 sign-ups". */
  total: string;
  /** Shown instead of the summary when every day is zero. */
  empty: string;
  bars: DailyBar[];
  /** The table's headers after "Date". */
  columns: string[];
  tick: (value: number) => string;
  /** The smallest gap between gridlines, so a count never gets half steps. */
  minStep?: number;
};

// The days come from the database already in IST, so they are printed as UTC to keep them from shifting.
const dayMonth = new Intl.DateTimeFormat("en-IN", { timeZone: "UTC", day: "numeric", month: "short" });
const dayMonthYear = new Intl.DateTimeFormat("en-IN", { timeZone: "UTC", day: "numeric", month: "short", year: "numeric" });
const weekday = new Intl.DateTimeFormat("en-IN", { timeZone: "UTC", weekday: "short", day: "numeric", month: "short" });
const asDate = (day: string) => new Date(`${day}T00:00:00Z`);
const percent = (fraction: number) => `${(fraction * 100).toFixed(3)}%`;

/**
 * A bar per day, drawn in a stretched SVG so it fills any width without JavaScript. Bars are
 * non-scaling strokes sized from the container's width; the axes are HTML so their text never stretches.
 * Screen readers get the summary, and the table holds every value without hovering.
 */
export function DailyBarChart({ id, title, total, empty, bars, columns, tick, minStep = 1 }: DailyBarChartProps) {
  const count = bars.length;
  const peak = bars.reduce<DailyBar | null>((best, bar) => (bar.value > (best?.value ?? 0) ? bar : best), null);
  const { top, ticks } = scale(peak?.value ?? 0, minStep);
  const every = count <= 7 ? 1 : count <= 31 ? 7 : 15;
  const first = bars[0]?.day;
  const last = bars[count - 1]?.day;
  const summary =
    peak && first && last
      ? `${total} between ${dayMonth.format(asDate(first))} and ${dayMonthYear.format(asDate(last))}. Busiest day: ${weekday.format(asDate(peak.day))}, with ${peak.detail}.`
      : empty;

  return (
    <figure className="min-w-0">
      <figcaption>
        <h3 className="font-ui text-[17px] font-semibold">{title}</h3>
        <p id={`${id}-summary`} className="t-note mt-1 text-fg-soft">
          {summary}
        </p>
      </figcaption>

      <div className="mt-2 grid grid-cols-[auto_minmax(0,1fr)] gap-x-2 pt-6">
        <div aria-hidden="true" className="flex h-44 flex-col-reverse justify-between font-ui text-[12px] text-fg-soft tabular-nums">
          {ticks.map((value) => (
            <span key={value} className="flex h-0 items-center justify-end">
              {tick(value)}
            </span>
          ))}
        </div>

        <div className="@container relative h-44">
          <svg
            role="img"
            aria-labelledby={`${id}-summary`}
            viewBox={`0 0 ${count} ${top}`}
            preserveAspectRatio="none"
            className="absolute inset-0 size-full overflow-visible"
          >
            {ticks.map((value) => (
              <line
                key={value}
                x1={0}
                x2={count}
                y1={top - value}
                y2={top - value}
                strokeWidth={1}
                vectorEffect="non-scaling-stroke"
                className={value === 0 ? "stroke-fg-soft/60" : "stroke-rule"}
              />
            ))}
            {/* Thin bars with air between them: at most 24px, and 60% of each day's slot. The attribute is for browsers without container units. */}
            <g strokeWidth={Math.min(24, 180 / count)} style={{ strokeWidth: `max(1px, min(24px, ${(60 / count).toFixed(3)}cqw))` }}>
              {bars.map((bar, index) => (
                <g key={bar.day} className="group">
                  <title>{`${weekday.format(asDate(bar.day))}: ${bar.detail}`}</title>
                  {/* The whole column answers the pointer, not only the thin bar. */}
                  <rect x={index} y={0} width={1} height={top} className="fill-transparent group-hover:fill-fg/[0.06]" />
                  {bar.value > 0 ? (
                    <line
                      x1={index + 0.5}
                      x2={index + 0.5}
                      y1={top}
                      // A tiny day still shows as a sliver rather than vanishing next to a big one.
                      y2={top - Math.max(bar.value, top * 0.015)}
                      vectorEffect="non-scaling-stroke"
                      className="stroke-gold-shape group-hover:stroke-t-goldink"
                    />
                  ) : null}
                </g>
              ))}
            </g>
          </svg>

          {peak ? <PeakLabel bar={peak} index={bars.indexOf(peak)} count={count} top={top} /> : null}
        </div>

        <div aria-hidden="true" className="relative col-start-2 mt-2 h-4 font-ui text-[12px] whitespace-nowrap text-fg-soft">
          {bars.map((bar, index) => {
            const fromEnd = count - 1 - index;
            if (fromEnd % every) return null;
            return (
              <span
                key={bar.day}
                // A week shows every day, which gets crowded on a phone, so phones skip every other one.
                className={cn("absolute top-0", fromEnd === 0 ? "right-0" : "-translate-x-1/2", every === 1 && fromEnd % 2 ? "max-sm:hidden" : "")}
                style={fromEnd === 0 ? undefined : { left: percent((index + 0.5) / count) }}
              >
                {dayMonth.format(asDate(bar.day))}
              </span>
            );
          })}
        </div>
      </div>

      {peak ? (
        <details className="mt-4">
          <summary className="t-note w-fit py-2 text-fg-soft hover:text-fg">Show the numbers</summary>
          <table className="mt-2 w-full font-ui text-[15px] tabular-nums">
            <caption className="sr-only">{title}</caption>
            <thead>
              <tr className="border-b border-rule text-fg-soft">
                <th scope="col" className="py-2 text-left font-medium">
                  Date
                </th>
                {columns.map((column) => (
                  <th key={column} scope="col" className="py-2 text-right font-medium">
                    {column}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-rule">
              {bars.map((bar) => (
                <tr key={bar.day}>
                  <th scope="row" className="py-1.5 text-left font-normal">
                    {weekday.format(asDate(bar.day))}
                  </th>
                  {bar.cells.map((cell, index) => (
                    <td key={index} className="py-1.5 text-right">
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </details>
      ) : null}
    </figure>
  );
}

/** Round gridlines from zero up past the largest value, about four of them. */
function scale(max: number, minStep: number) {
  if (max <= 0) return { top: minStep, ticks: [0] };
  const rough = max / 4;
  const power = 10 ** Math.floor(Math.log10(rough));
  const step = Math.max(minStep, [1, 2, 5, 10].map((multiple) => multiple * power).find((candidate) => candidate >= rough) ?? 10 * power);
  const steps = Math.ceil(max / step);
  return { top: steps * step, ticks: Array.from({ length: steps + 1 }, (_, index) => index * step) };
}

/** The one direct label: the busiest day's value, just above its bar. */
function PeakLabel({ bar, index, count, top }: { bar: DailyBar; index: number; count: number; top: number }) {
  // Near either end the label hangs inwards from its bar, so it never runs off the page.
  const centre = (index + 0.5) / count;
  const side = centre < 0.15 ? "start" : centre > 0.85 ? "end" : "centre";
  const left = (side === "start" ? index : side === "end" ? index + 1 : index + 0.5) / count;
  return (
    <span
      aria-hidden="true"
      className={cn(
        "absolute mb-1 font-ui text-[12px] font-semibold whitespace-nowrap",
        side === "end" ? "-translate-x-full" : side === "centre" ? "-translate-x-1/2" : "",
      )}
      style={{ left: percent(left), bottom: percent(bar.value / top) }}
    >
      {bar.label}
    </span>
  );
}
