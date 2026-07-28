import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Timer, CheckCircle2, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

function diff(target: Date) {
  const ms = target.getTime() - Date.now();
  const abs = Math.abs(ms);
  const d = Math.floor(abs / 86_400_000);
  const h = Math.floor((abs % 86_400_000) / 3_600_000);
  const m = Math.floor((abs % 3_600_000) / 60_000);
  const s = Math.floor((abs % 60_000) / 1000);
  return { d, h, m, s, overdue: ms < 0, ms };
}

export function CountdownTimer({
  startAt, dueAt, compact = false,
}: { startAt?: string | Date | null; dueAt: string | Date; compact?: boolean }) {
  const due = dueAt instanceof Date ? dueAt : new Date(dueAt);
  const [tick, setTick] = useState(() => diff(due));
  useEffect(() => {
    const id = setInterval(() => setTick(diff(due)), 1000);
    return () => clearInterval(id);
  }, [due.getTime()]);

  const start = startAt ? (startAt instanceof Date ? startAt : new Date(startAt)) : null;
  const totalMs = start ? due.getTime() - start.getTime() : 0;
  const elapsed = start ? Math.max(0, Date.now() - start.getTime()) : 0;
  const pct = totalMs > 0 ? Math.min(100, Math.max(0, (elapsed / totalMs) * 100)) : 0;

  const tone = tick.overdue ? "rose" : pct > 80 ? "amber" : "electric";

  return (
    <div
      dir="rtl"
      className={cn(
        "relative overflow-hidden rounded-3xl border p-5",
        tick.overdue
          ? "border-rose-400/40 bg-gradient-to-br from-rose-500/15 via-card to-rose-500/5"
          : "border-electric/30 bg-gradient-to-br from-electric/10 via-card to-purple-accent/10",
      )}
    >
      <div className="pointer-events-none absolute -top-16 -end-16 h-40 w-40 rounded-full bg-electric/20 blur-3xl" />
      <div className="relative flex items-center justify-between flex-wrap gap-3 mb-4">
        <div className="flex items-center gap-2">
          <div className={cn("grid h-10 w-10 place-items-center rounded-2xl text-white shadow-glow",
            tick.overdue ? "bg-gradient-to-br from-rose-500 to-rose-600"
                         : "bg-gradient-to-br from-electric to-purple-accent")}>
            {tick.overdue ? <AlertTriangle className="h-5 w-5" /> : <Timer className="h-5 w-5" />}
          </div>
          <div>
            <div className="text-[11px] text-muted-foreground">
              {tick.overdue ? "متأخر عن الموعد" : "الوقت المتبقي للتسليم"}
            </div>
            <div className="text-[13px] font-black">
              {new Date(due).toLocaleDateString("ar-SA", { day: "numeric", month: "long", year: "numeric" })}
            </div>
          </div>
        </div>
        {!compact && pct >= 100 && !tick.overdue && (
          <span className="rounded-full bg-emerald-500/15 px-3 py-1 text-[11px] font-bold text-emerald-500 ring-1 ring-emerald-500/30 inline-flex items-center gap-1">
            <CheckCircle2 className="h-3 w-3" /> اكتمل الوقت
          </span>
        )}
      </div>

      <div className="relative grid grid-cols-4 gap-2 mb-4">
        {[
          { v: tick.d, l: "يوم" },
          { v: tick.h, l: "ساعة" },
          { v: tick.m, l: "دقيقة" },
          { v: tick.s, l: "ثانية" },
        ].map((u, i) => (
          <motion.div
            key={u.l}
            initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
            className="rounded-2xl bg-background/70 backdrop-blur px-2 py-3 text-center ring-1 ring-border"
          >
            <div className={cn("font-black tabular-nums text-2xl md:text-3xl",
              tone === "rose" ? "text-rose-400" : tone === "amber" ? "text-amber-400" : "text-electric")}>
              {String(u.v).padStart(2, "0")}
            </div>
            <div className="text-[10px] text-muted-foreground mt-0.5">{u.l}</div>
          </motion.div>
        ))}
      </div>

      {start && (
        <div className="relative">
          <div className="flex items-center justify-between text-[10px] text-muted-foreground mb-1.5">
            <span>{new Date(start).toLocaleDateString("ar-SA")}</span>
            <span>{Math.round(pct)}%</span>
            <span>{new Date(due).toLocaleDateString("ar-SA")}</span>
          </div>
          <div className="h-2 rounded-full bg-muted/40 overflow-hidden">
            <motion.div
              initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.8 }}
              className={cn("h-full rounded-full",
                tick.overdue ? "bg-gradient-to-l from-rose-500 to-rose-400"
                             : "bg-gradient-to-l from-electric to-purple-accent")}
            />
          </div>
        </div>
      )}
    </div>
  );
}
