import type { LucideIcon } from "lucide-react";
import { TrendingUp, TrendingDown } from "lucide-react";
import type { ReactNode } from "react";
import { Area, AreaChart, ResponsiveContainer } from "recharts";
import { cn } from "@/lib/utils";

const ACCENTS: Record<string, { chip: string; stroke: string; glow: string }> = {
  electric: { chip: "bg-electric/10 text-electric", stroke: "#3b82f6", glow: "shadow-[inset_0_1px_0_0_rgba(59,130,246,0.15)]" },
  purple: { chip: "bg-purple-accent/10 text-purple-accent", stroke: "#a855f7", glow: "shadow-[inset_0_1px_0_0_rgba(168,85,247,0.15)]" },
  cyan: { chip: "bg-cyan-500/10 text-cyan-400", stroke: "#06b6d4", glow: "shadow-[inset_0_1px_0_0_rgba(6,182,212,0.15)]" },
  amber: { chip: "bg-amber-500/10 text-amber-400", stroke: "#f59e0b", glow: "shadow-[inset_0_1px_0_0_rgba(245,158,11,0.15)]" },
  rose: { chip: "bg-rose-500/10 text-rose-400", stroke: "#f43f5e", glow: "shadow-[inset_0_1px_0_0_rgba(244,63,94,0.15)]" },
  emerald: { chip: "bg-emerald-500/10 text-emerald-400", stroke: "#10b981", glow: "shadow-[inset_0_1px_0_0_rgba(16,185,129,0.15)]" },
};

/**
 * Ultra-compact metric tile inspired by Linear/Stripe dashboards.
 * Fits ~120px height. Combines icon + label + value + delta + inline sparkline.
 */
export function MetricChip({
  icon: Icon,
  label,
  value,
  trend,
  spark,
  accent = "electric",
  loading,
  hint,
}: {
  icon: LucideIcon;
  label: string;
  value: ReactNode;
  trend?: number;
  spark?: number[];
  accent?: keyof typeof ACCENTS;
  loading?: boolean;
  hint?: string;
}) {
  const acc = ACCENTS[accent];
  const sparkData = (spark ?? []).map((v, i) => ({ i, v }));
  const gradId = `mc-${accent}-${label.replace(/\s+/g, "")}`;
  return (
    <div className={cn("group relative overflow-hidden rounded-xl border border-border bg-card px-3 py-2.5", acc.glow)}>
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className={cn("grid h-6 w-6 place-items-center rounded-md shrink-0", acc.chip)}>
            <Icon className="h-3.5 w-3.5" />
          </span>
          <span className="text-[11px] text-muted-foreground truncate">{label}</span>
        </div>
        {typeof trend === "number" && !loading && (
          <span className={cn(
            "inline-flex items-center gap-0.5 rounded px-1 py-0.5 text-[10px] font-bold shrink-0",
            trend >= 0 ? "bg-emerald-500/10 text-emerald-400" : "bg-rose-500/10 text-rose-400",
          )}>
            {trend >= 0 ? <TrendingUp className="h-2.5 w-2.5" /> : <TrendingDown className="h-2.5 w-2.5" />}
            {Math.abs(trend).toFixed(0)}%
          </span>
        )}
      </div>
      <div className="mt-1.5 text-lg md:text-xl font-black tracking-tight leading-none whitespace-nowrap overflow-hidden text-ellipsis">
        {loading ? <span className="inline-block h-5 w-14 rounded bg-muted animate-pulse" /> : value}
      </div>
      {hint && <div className="mt-0.5 text-[10px] text-muted-foreground truncate">{hint}</div>}
      {sparkData.length > 0 && !loading && (
        <div className="mt-1 h-7 -mx-3 -mb-2.5 opacity-80 group-hover:opacity-100 transition">
          <ResponsiveContainer>
            <AreaChart data={sparkData} margin={{ top: 2, right: 0, bottom: 0, left: 0 }}>
              <defs>
                <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={acc.stroke} stopOpacity={0.5} />
                  <stop offset="100%" stopColor={acc.stroke} stopOpacity={0} />
                </linearGradient>
              </defs>
              <Area type="monotone" dataKey="v" stroke={acc.stroke} strokeWidth={1.5} fill={`url(#${gradId})`} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

/** Circular progress ring used in KPI stacks. */
export function RingKpi({
  label,
  value,
  progress,
  color = "electric",
  sub,
}: {
  label: string;
  value: ReactNode;
  progress: number;
  color?: keyof typeof ACCENTS;
  sub?: string;
}) {
  const acc = ACCENTS[color];
  const pct = Math.max(0, Math.min(100, progress));
  const r = 22;
  const c = 2 * Math.PI * r;
  const dash = (pct / 100) * c;
  return (
    <div className="flex items-center gap-3 rounded-xl border border-border bg-card px-3 py-2.5">
      <div className="relative h-14 w-14 shrink-0">
        <svg viewBox="0 0 56 56" className="h-14 w-14 -rotate-90">
          <circle cx="28" cy="28" r={r} stroke="currentColor" strokeWidth="4" fill="none" className="text-muted/30" />
          <circle
            cx="28" cy="28" r={r}
            stroke={acc.stroke} strokeWidth="4" fill="none"
            strokeDasharray={`${dash} ${c}`} strokeLinecap="round"
            style={{ transition: "stroke-dasharray 600ms ease" }}
          />
        </svg>
        <div className="absolute inset-0 grid place-items-center text-[10px] font-black">{pct}%</div>
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-[11px] text-muted-foreground truncate">{label}</div>
        <div className="text-sm font-black leading-tight truncate">{value}</div>
        {sub && <div className="text-[10px] text-muted-foreground truncate">{sub}</div>}
      </div>
    </div>
  );
}
