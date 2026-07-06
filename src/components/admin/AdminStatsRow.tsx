import type { LucideIcon } from "lucide-react";
import { MetricChip } from "@/components/dashboard/MetricChip";

export type AdminStat = {
  icon: LucideIcon;
  label: string;
  value: React.ReactNode;
  hint?: string;
  accent?: "electric" | "purple" | "cyan" | "amber" | "rose" | "emerald";
  trend?: number;
  spark?: number[];
};

/**
 * Unified stats grid used at the top of every admin list page.
 * Adaptive: 2 cols on mobile → 3/4/6 on larger screens depending on count.
 */
export function AdminStatsRow({ stats, loading }: { stats: AdminStat[]; loading?: boolean }) {
  const cols = stats.length >= 6
    ? "grid-cols-2 sm:grid-cols-3 lg:grid-cols-6"
    : stats.length === 5
      ? "grid-cols-2 sm:grid-cols-3 lg:grid-cols-5"
      : stats.length === 4
        ? "grid-cols-2 lg:grid-cols-4"
        : stats.length === 3
          ? "grid-cols-1 sm:grid-cols-3"
          : "grid-cols-2";
  return (
    <div className={`grid ${cols} gap-2.5 sm:gap-3`}>
      {stats.map((s, i) => (
        <MetricChip
          key={i}
          icon={s.icon}
          label={s.label}
          value={s.value ?? "—"}
          hint={s.hint}
          accent={s.accent ?? "electric"}
          trend={s.trend}
          spark={s.spark}
          loading={loading}
        />
      ))}
    </div>
  );
}
