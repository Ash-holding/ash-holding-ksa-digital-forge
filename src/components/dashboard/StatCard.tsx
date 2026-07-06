import { motion } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import { TrendingUp, TrendingDown } from "lucide-react";
import { Area, AreaChart, ResponsiveContainer } from "recharts";
import { cn } from "@/lib/utils";

export function StatCard({
  icon: Icon,
  label,
  value,
  hint,
  accent = "electric",
  loading,
  delay = 0,
  trend,
  spark,
}: {
  icon: LucideIcon;
  label: string;
  value: string | number;
  hint?: string;
  accent?: "electric" | "purple" | "cyan" | "amber" | "rose" | "emerald";
  loading?: boolean;
  delay?: number;
  trend?: number;
  spark?: number[];
}) {
  const accents: Record<string, { chip: string; stroke: string; fill: string }> = {
    electric: { chip: "bg-electric/10 text-electric ring-electric/20", stroke: "#3b82f6", fill: "#3b82f6" },
    purple: { chip: "bg-purple-accent/10 text-purple-accent ring-purple-accent/20", stroke: "#a855f7", fill: "#a855f7" },
    cyan: { chip: "bg-cyan-500/10 text-cyan-400 ring-cyan-500/20", stroke: "#06b6d4", fill: "#06b6d4" },
    amber: { chip: "bg-amber-500/10 text-amber-400 ring-amber-500/20", stroke: "#f59e0b", fill: "#f59e0b" },
    rose: { chip: "bg-rose-500/10 text-rose-400 ring-rose-500/20", stroke: "#f43f5e", fill: "#f43f5e" },
    emerald: { chip: "bg-emerald-500/10 text-emerald-400 ring-emerald-500/20", stroke: "#10b981", fill: "#10b981" },
  };
  const acc = accents[accent];
  const sparkData = (spark ?? []).map((v, i) => ({ i, v }));
  const gradId = `spark-${accent}-${label.replace(/\s+/g, "")}`;
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className="relative overflow-hidden rounded-2xl border border-border bg-card p-4 md:p-5 shadow-card"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="text-xs text-muted-foreground">{label}</div>
          <div className="mt-2 text-2xl md:text-3xl font-black tracking-tight">
            {loading ? <span className="inline-block h-6 w-16 rounded bg-muted animate-pulse" /> : value}
          </div>
          <div className="mt-1 flex items-center gap-2 text-[11px]">
            {typeof trend === "number" && !loading && (
              <span className={cn(
                "inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 font-bold",
                trend >= 0 ? "bg-emerald-500/10 text-emerald-400" : "bg-rose-500/10 text-rose-400",
              )}>
                {trend >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                {Math.abs(trend).toFixed(1)}%
              </span>
            )}
            {hint && <span className="text-muted-foreground truncate">{hint}</span>}
          </div>
        </div>
        <div className={cn("grid h-11 w-11 place-items-center rounded-xl ring-1 shrink-0", acc.chip)}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
      {sparkData.length > 0 && !loading && (
        <div className="mt-3 h-10 -mx-1">
          <ResponsiveContainer>
            <AreaChart data={sparkData} margin={{ top: 2, right: 0, bottom: 0, left: 0 }}>
              <defs>
                <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={acc.fill} stopOpacity={0.5} />
                  <stop offset="100%" stopColor={acc.fill} stopOpacity={0} />
                </linearGradient>
              </defs>
              <Area type="monotone" dataKey="v" stroke={acc.stroke} strokeWidth={1.75} fill={`url(#${gradId})`} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </motion.div>
  );
}
