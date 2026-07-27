import { cn } from "@/lib/utils";

/** Small pulsing "live" chip used in client page headers. */
export function LiveBadge({ interval = 15, className }: { interval?: number; className?: string }) {
  return (
    <span className={cn(
      "inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 h-7 text-[10px] font-bold text-emerald-400 whitespace-nowrap",
      className,
    )}>
      <span className="relative flex h-1.5 w-1.5">
        <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75 animate-ping" />
        <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-400" />
      </span>
      مباشر · {interval}ث
    </span>
  );
}

/** Days-until-due badge with color-coded urgency. */
export function DueBadge({ date }: { date?: string | Date | null }) {
  if (!date) return <span className="text-[10px] text-muted-foreground">—</span>;
  const ts = new Date(date).getTime();
  const days = Math.ceil((ts - Date.now()) / 86400000);
  let tone = "border-emerald-500/30 bg-emerald-500/10 text-emerald-400";
  let label = `خلال ${days} يوم`;
  if (days < 0) { tone = "border-rose-500/40 bg-rose-500/10 text-rose-400"; label = `متأخر ${Math.abs(days)}ي`; }
  else if (days === 0) { tone = "border-amber-500/40 bg-amber-500/10 text-amber-400"; label = "اليوم"; }
  else if (days <= 3) { tone = "border-amber-500/40 bg-amber-500/10 text-amber-400"; label = `خلال ${days}ي`; }
  else if (days <= 14) { tone = "border-cyan-500/30 bg-cyan-500/10 text-cyan-400"; label = `خلال ${days}ي`; }
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold whitespace-nowrap", tone)}>
      {label}
    </span>
  );
}
