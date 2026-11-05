import { cn } from "cn";

/** A ring showing how much of a course is done. The percentage is also given as text for screen readers. */
export function ProgressRing({ value, size = 64, label, className }: { value: number; size?: number; label: string; className?: string }) {
  const stroke = Math.max(3, Math.round(size / 14));
  const radius = (size - stroke) / 2;
  const length = 2 * Math.PI * radius;
  const percent = Math.round(value * 100);
  return (
    <div role="img" aria-label={`${label}: ${percent}%`} className={cn("relative inline-grid shrink-0 place-items-center", className)} style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90" aria-hidden="true">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="var(--rule)" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={value >= 1 ? "var(--gold-shape)" : "var(--red)"}
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

export function ProgressBar({ value, label, className }: { value: number; label: string; className?: string }) {
  const percent = Math.round(value * 100);
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={percent}
      className={cn("h-1.5 w-full overflow-hidden bg-rule", className)}
    >
      <div
        className={cn("h-full transition-[width] duration-700 ease-out motion-reduce:transition-none", value >= 1 ? "bg-gold-shape" : "bg-red")}
        style={{ width: `${percent}%` }}
      />
    </div>
  );
}
