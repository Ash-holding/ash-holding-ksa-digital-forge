import { Link } from "@tanstack/react-router";
import { ArrowRight, RefreshCw } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export function LiveDot({ ok, label }: { ok?: boolean; label?: string }) {
  return (
    <span className={cn(
      "inline-flex items-center gap-1.5 rounded-full border px-2 h-6 text-[10px] font-bold whitespace-nowrap",
      ok
        ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
        : "border-amber-500/30 bg-amber-500/10 text-amber-500",
    )}>
      <span className="relative flex h-1.5 w-1.5">
        <span className={cn("absolute inline-flex h-full w-full rounded-full opacity-75",
          ok ? "bg-emerald-400 animate-ping" : "bg-amber-400")} />
        <span className={cn("relative inline-flex rounded-full h-1.5 w-1.5",
          ok ? "bg-emerald-400" : "bg-amber-400")} />
      </span>
      {label ?? "مباشر"}
    </span>
  );
}

export function DetailShell({
  backTo,
  backLabel = "رجوع",
  icon: Icon,
  title,
  subtitle,
  status,
  live,
  onRefresh,
  refreshing,
  actions,
  loading,
  children,
}: {
  backTo: string;
  backLabel?: string;
  icon?: LucideIcon;
  title: ReactNode;
  subtitle?: ReactNode;
  status?: ReactNode;
  live?: boolean;
  onRefresh?: () => void;
  refreshing?: boolean;
  actions?: ReactNode;
  loading?: boolean;
  children: ReactNode;
}) {
  return (
    <div className="space-y-4">
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 rounded-2xl border border-border bg-gradient-to-b from-card/70 to-card/30 backdrop-blur px-3.5 py-3"
      >
        <Link
          to={backTo}
          className="grid h-9 w-9 place-items-center rounded-xl border border-border bg-background/60 text-muted-foreground hover:text-electric hover:border-electric/40 transition shrink-0"
          aria-label={backLabel}
        >
          <ArrowRight className="h-4 w-4" />
        </Link>
        <div className="flex min-w-0 items-center gap-3">
          {Icon && (
            <span className="hidden sm:grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-electric to-purple-500 text-white shadow-md shadow-electric/25 shrink-0">
              <Icon className="h-5 w-5" />
            </span>
          )}
          <div className="min-w-0">
            {loading ? (
              <Skeleton className="h-5 w-40" />
            ) : (
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="truncate text-base sm:text-lg font-black tracking-tight text-foreground">
                  {title}
                </h1>
                {status}
                {live && <LiveDot ok label="مباشر" />}
              </div>
            )}
            {subtitle && !loading && (
              <p className="mt-0.5 truncate text-[11px] sm:text-xs text-muted-foreground">{subtitle}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {onRefresh && (
            <Button size="icon" variant="ghost" onClick={onRefresh} className="h-9 w-9" aria-label="تحديث">
              <RefreshCw className={cn("h-4 w-4", refreshing && "animate-spin")} />
            </Button>
          )}
          {actions}
        </div>
      </motion.div>
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
      >
        {children}
      </motion.div>
    </div>
  );
}

export function DetailSection({
  title,
  icon: Icon,
  actions,
  children,
  className,
}: {
  title?: ReactNode;
  icon?: LucideIcon;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("rounded-2xl border border-border bg-card/70 backdrop-blur p-4 sm:p-5", className)}>
      {(title || actions) && (
        <header className="mb-3 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            {Icon && <Icon className="h-4 w-4 text-electric shrink-0" />}
            {title && <h2 className="text-sm font-bold tracking-tight truncate">{title}</h2>}
          </div>
          {actions && <div className="flex items-center gap-1.5 shrink-0">{actions}</div>}
        </header>
      )}
      {children}
    </section>
  );
}

export function KV({ k, v, mono, dir }: { k: string; v: ReactNode; mono?: boolean; dir?: "ltr" | "rtl" }) {
  return (
    <div className="flex flex-col gap-0.5 py-1.5">
      <span className="text-[10px] uppercase tracking-wider text-muted-foreground/70">{k}</span>
      <span className={cn("text-sm font-semibold text-foreground", mono && "font-mono")} dir={dir}>
        {v ?? "—"}
      </span>
    </div>
  );
}
