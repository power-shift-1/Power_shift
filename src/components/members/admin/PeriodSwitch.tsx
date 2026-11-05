import { cn } from "cn";
import Link from "next/link";

export const PERIODS = [7, 30, 90] as const;
export const DEFAULT_PERIOD = 30;

/** Links rather than client state, so the switch works before JavaScript loads and each period has its own URL. */
export function PeriodSwitch({ days, href }: { days: number; href: string }) {
  return (
    <nav aria-label="Period" className="-mx-2 flex flex-wrap gap-1">
      {PERIODS.map((option) => (
        <Link
          key={option}
          href={`${href}?days=${option}`}
          scroll={false}
          aria-current={option === days ? "page" : undefined}
          className={cn(
            "border-b-2 px-2 py-2 font-ui text-[15px] font-semibold whitespace-nowrap transition-colors",
            option === days ? "border-b-red text-fg" : "border-b-transparent text-fg-soft hover:text-fg",
          )}
        >
          Last {option} days
        </Link>
      ))}
    </nav>
  );
}
