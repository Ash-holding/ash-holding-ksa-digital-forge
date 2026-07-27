import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

/**
 * Compact page header for client portal pages.
 * Vertical gradient accent bar + title + description + optional actions.
 * Mirrors the admin PageHeader style with a client-toned electric/purple gradient.
 */
export function ClientPageHeader({
  icon: Icon,
  title,
  description,
  actions,
  live = true,
}: {
  icon: LucideIcon;
  title: string;
  description?: string;
  actions?: ReactNode;
  live?: boolean;
}) {
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-2xl border border-border bg-card/50 backdrop-blur px-3.5 py-3 sm:px-4 sm:py-3.5">
      <div className="flex min-w-0 items-center gap-3">
        <span className="relative shrink-0 grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-electric/20 to-purple-accent/20 text-electric border border-electric/20">
          <Icon className="h-5 w-5" />
          {live && (
            <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-emerald-400 animate-pulse ring-2 ring-card" />
          )}
        </span>
        <div className="min-w-0">
          <h1 className="truncate text-base sm:text-lg font-black tracking-tight">{title}</h1>
          {description && (
            <p className="truncate text-[11px] sm:text-xs text-muted-foreground">{description}</p>
          )}
        </div>
      </div>
      {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
    </div>
  );
}
