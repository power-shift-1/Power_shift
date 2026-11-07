import { cn } from "cn";

type RingProps = {
  value: number;
  size?: number;
  label: string;
  /** On the royal or ink bands, where the red arc and the rule track would not stand out. */
  onDark?: boolean;
  /** When the same progress is written out next to it, so screen readers don't hear it twice. */
  decorative?: boolean;
  className?: string;
};

/** A ring showing how much of a course is done. The percentage is also given as text for screen readers. */
export function ProgressRing({ value, size = 64, label, onDark = false, decorative = false, className }: RingProps) {
  const stroke = Math.max(3, Math.round(size / 14));
  const radius = (size - stroke) / 2;
  const length = 2 * Math.PI * radius;
  const percent = Math.round(value * 100);
  const track = onDark ? "rgb(255 255 255 / 0.22)" : "var(--rule)";
  const arc = onDark ? "var(--t-goldleaf)" : value >= 1 ? "var(--gold-shape)" : "var(--red)";
  return (
    <div
      {...(decorative ? { "aria-hidden": true } : { role: "img", "aria-label": `${label}: ${percent}%` })}
      className={cn("relative inline-grid shrink-0 place-items-center", className)}
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90" aria-hidden="true">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={track} strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={arc}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={length}
          strokeDashoffset={length * (1 - value)}
          className="transition-[stroke-dashoffset] duration-700 ease-out motion-reduce:transition-none"
        />
      </svg>
      <span aria-hidden="true" className="absolute font-ui font-semibold tabular-nums" style={{ fontSize: Math.max(11, size * 0.24) }}>
        {percent}%
      </span>
    </div>
  );
}

export function ProgressBar({ value, label, decorative = false, className }: { value: number; label: string; decorative?: boolean; className?: string }) {
  const percent = Math.round(value * 100);
  return (
    <div
      {...(decorative
        ? { "aria-hidden": true }
        : { role: "progressbar", "aria-label": label, "aria-valuemin": 0, "aria-valuemax": 100, "aria-valuenow": percent })}
      className={cn("h-1.5 w-full overflow-hidden bg-rule", className)}
    >
      <div
        className={cn("h-full transition-[width] duration-700 ease-out motion-reduce:transition-none", value >= 1 ? "bg-gold-shape" : "bg-red")}
        style={{ width: `${percent}%` }}
      />
    </div>
  );
}
