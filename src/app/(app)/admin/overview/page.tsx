import { cn } from "cn";
import { Download } from "lucide-react";
import type { Metadata } from "next";

import { dailyStats, PAGE_SIZE, readEvery, type UserClient } from "@/components/members/admin/admin-data";
import { AdminFrame } from "@/components/members/admin/AdminFrame";
import { DailyBarChart } from "@/components/members/admin/charts/DailyBarChart";
import { DEFAULT_PERIOD, PERIODS, PeriodSwitch } from "@/components/members/admin/PeriodSwitch";
import { Empty, Panel } from "@/components/members/PageIntro";
import { requireAdmin } from "@/lib/auth";
import { formatDateTime, formatPrice } from "@/lib/format";
import { createUserClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Admin · The Power Shift" };

type Sale = { id: string; user_id: string; amount_paise: number; status: string; source: string; created_at: string; courses: { title: string } | null };
type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

const counts = new Intl.NumberFormat("en-IN");
const compactRupees = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", notation: "compact", maximumFractionDigits: 1 });
const plural = (count: number, word: string) => `${counts.format(count)} ${word}${count === 1 ? "" : "s"}`;

export default async function AdminOverview({ searchParams }: Props) {
  await requireAdmin();
  const params = await searchParams;
  const days = PERIODS.find((option) => String(option) === params.days) ?? DEFAULT_PERIOD;
  const supabase = (await createUserClient())!;
  const [members, attendees, sold, sales, latest, daily] = await Promise.all([
    supabase.from("profiles").select("id", { count: "exact", head: true }),
    supabase.from("profiles").select("id", { count: "exact", head: true }).eq("attended_masterclass", true),
    supabase.from("purchases").select("id", { count: "exact", head: true }).eq("status", "paid").eq("source", "razorpay"),
    totalSales(supabase),
    supabase
      .from("purchases")
      .select("id, user_id, amount_paise, status, source, created_at, courses(title)")
      .order("created_at", { ascending: false })
      .limit(12)
      .overrideTypes<Sale[], { merge: false }>(),
    dailyStats(supabase, days),
  ]);

  const recent = latest.data ?? [];
  const { data: names } = recent.length
    ? await supabase.from("profiles").select("id, full_name").in("id", [...new Set(recent.map((sale) => sale.user_id))])
    : { data: [] };
  const nameOf = new Map((names ?? []).map((row) => [row.id as string, (row.full_name as string) || "Member"]));

  if (daily.error) console.error("[admin] Daily stats:", daily.error.code, daily.error.message);
  const rows = (daily.data ?? []).map((row) => ({
    day: row.stat_day,
    signups: Number(row.signup_count),
    purchases: Number(row.purchase_count),
    sales: Number(row.sales_paise),
  }));
  const sum = (pick: (row: (typeof rows)[number]) => number) => rows.reduce((total, row) => total + pick(row), 0);
  const period = { signups: sum((row) => row.signups), purchases: sum((row) => row.purchases), sales: sum((row) => row.sales) };

  const allTime = [
    { label: "Members", value: counts.format(members.count ?? 0) },
    { label: "From the masterclass", value: counts.format(attendees.count ?? 0) },
    { label: "Courses sold", value: counts.format(sold.count ?? 0) },
    { label: "Sales", value: sales === null ? "–" : formatPrice(sales) },
  ];
  const inPeriod = [
    { label: "Sign-ups", value: counts.format(period.signups) },
    { label: "Courses sold", value: counts.format(period.purchases) },
    { label: "Sales", value: formatPrice(period.sales) },
  ];

  return (
    <AdminFrame title="Overview" lead="All-time totals first, then the last 7, 30 or 90 days, day by day in India time. Sales exclude refunds and courses added by hand.">
      <Stats stats={allTime} className="lg:grid-cols-4" />

      <div className="-mt-4 flex flex-wrap gap-x-8">
        {/* Plain links: these are file downloads, not pages for the router. */}
        <a href="/api/admin/members.csv" download className="masthead-link gap-2">
          <Download aria-hidden="true" className="size-4" />
          Export members (CSV)
        </a>
        <a href="/api/admin/purchases.csv" download className="masthead-link gap-2">
          <Download aria-hidden="true" className="size-4" />
          Export purchases (CSV)
        </a>
      </div>

      <Panel title="Sign-ups and sales">
        <div className="flex flex-col gap-8">
          <PeriodSwitch days={days} href="/admin/overview" />
          {daily.error || !rows.length ? (
            <Empty>Could not load the daily figures. Please refresh the page.</Empty>
          ) : (
            <>
              <Stats stats={inPeriod} className="sm:grid-cols-3" />
              <div className="grid gap-12 lg:grid-cols-2">
                <DailyBarChart
                  id="signups"
                  title="Sign-ups per day"
                  total={plural(period.signups, "sign-up")}
                  empty={`No sign-ups in the last ${days} days.`}
                  columns={["Sign-ups"]}
                  tick={(value) => counts.format(value)}
                  bars={rows.map((row) => ({
                    day: row.day,
                    value: row.signups,
                    label: counts.format(row.signups),
                    detail: plural(row.signups, "sign-up"),
                    cells: [counts.format(row.signups)],
                  }))}
                />
                <DailyBarChart
                  id="sales"
                  title="Sales per day"
                  total={`${formatPrice(period.sales)} from ${plural(period.purchases, "course")}`}
                  empty={`No sales in the last ${days} days.`}
                  columns={["Courses sold", "Sales"]}
                  tick={(paise) => compactRupees.format(paise / 100)}
                  // Gridlines step by whole rupees at least.
                  minStep={100}
                  bars={rows.map((row) => ({
                    day: row.day,
                    value: row.sales,
                    label: formatPrice(row.sales),
                    detail: row.sales ? `${formatPrice(row.sales)} from ${plural(row.purchases, "course")}` : "no sales",
                    cells: [counts.format(row.purchases), formatPrice(row.sales)],
                  }))}
                />
              </div>
            </>
          )}
        </div>
      </Panel>

      <Panel title="Recent purchases">
        {recent.length ? (
          <ul className="divide-y divide-rule">
            {recent.map((sale) => (
              <li key={sale.id} className="flex flex-wrap justify-between gap-2 py-3 font-ui text-[15px]">
                <span className="min-w-0 break-words">
                  <span className="font-semibold">{nameOf.get(sale.user_id) ?? "Member"}</span> · {sale.courses?.title}
                </span>
                <span className="text-fg-soft">
                  {sale.status === "refunded" ? "Refunded" : sale.source === "admin" ? "Added by hand" : formatPrice(sale.amount_paise)} ·{" "}
                  {formatDateTime(sale.created_at)}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <Empty>No purchases yet.</Empty>
        )}
      </Panel>
    </AdminFrame>
  );
}

function Stats({ stats, className }: { stats: { label: string; value: string }[]; className?: string }) {
  return (
    <dl className={cn("grid grid-cols-2 gap-6", className)}>
      {stats.map((stat) => (
        <div key={stat.label} className="min-w-0 border-t-[1.5px] border-t-gold-line pt-4">
          <dt className="t-note text-fg-soft">{stat.label}</dt>
          {/* Proportional figures: equal-width digits look loose at this size. Smaller on phones so ₹1,23,456 fits half the width. */}
          <dd className="mt-1 font-display text-[length:clamp(1.875rem,1.4rem+1.6vw,2.5rem)] leading-none break-words">{stat.value}</dd>
        </div>
      ))}
    </dl>
  );
}

/** PostgREST can't SUM unless aggregates are switched on, so this adds up the paid amounts a page at a time. */
async function totalSales(supabase: UserClient) {
  try {
    const rows = await readEvery(async (offset) => {
      const { data, error } = await supabase
        .from("purchases")
        .select("amount_paise")
        .eq("status", "paid")
        .eq("source", "razorpay")
        .order("id")
        .range(offset, offset + PAGE_SIZE - 1)
        .overrideTypes<{ amount_paise: number }[], { merge: false }>();
      if (error) throw error;
      return data;
    });
    return rows.reduce((sum, row) => sum + row.amount_paise, 0);
  } catch (error) {
    console.error("[admin] Sales total:", error);
    return null;
  }
}
