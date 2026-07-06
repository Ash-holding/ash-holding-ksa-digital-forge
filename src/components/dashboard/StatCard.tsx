import { motion } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export function StatCard({
  icon: Icon,
  label,
  value,
  hint,
  accent = "electric",
  loading,
  delay = 0,
}: {
  icon: LucideIcon;
  label: string;
  value: string | number;
  hint?: string;
  accent?: "electric" | "purple" | "cyan" | "amber" | "rose" | "emerald";
  loading?: boolean;
  delay?: number;
}) {
  const accents: Record<string, string> = {
    electric: "bg-electric/10 text-electric ring-electric/20",
    purple: "bg-purple-accent/10 text-purple-accent ring-purple-accent/20",
    cyan: "bg-cyan-500/10 text-cyan-400 ring-cyan-500/20",
    amber: "bg-amber-500/10 text-amber-400 ring-amber-500/20",
    rose: "bg-rose-500/10 text-rose-400 ring-rose-500/20",
    emerald: "bg-emerald-500/10 text-emerald-400 ring-emerald-500/20",
  };
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className="rounded-2xl border border-border bg-card p-4 md:p-5 shadow-card"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-xs text-muted-foreground">{label}</div>
          <div className="mt-2 text-2xl md:text-3xl font-black tracking-tight">
            {loading ? <span className="inline-block h-6 w-16 rounded bg-muted animate-pulse" /> : value}
          </div>
          {hint && <div className="mt-1 text-[11px] text-muted-foreground">{hint}</div>}
        </div>
        <div className={cn("grid h-11 w-11 place-items-center rounded-xl ring-1", accents[accent])}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </motion.div>
  );
}
