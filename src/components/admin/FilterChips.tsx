import { cn } from "@/lib/utils";

export type FilterChip = {
  key: string;
  label: string;
  count?: number;
};

/**
 * Horizontally-scrolling filter chip bar with counts.
 * Use above DataTable for consistent quick-filter UX across admin pages.
 */
export function FilterChips({
  chips,
  value,
  onChange,
  className,
}: {
  chips: FilterChip[];
  value: string | null;
  onChange: (key: string | null) => void;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-wrap items-center gap-1.5", className)}>
      {chips.map((c) => {
        const active = value === c.key || (value == null && c.key === "");
        return (
          <button
            key={c.key || "all"}
            type="button"
            onClick={() => onChange(c.key ? c.key : null)}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full border px-3 h-8 text-xs font-semibold transition whitespace-nowrap",
              active
                ? "bg-electric text-primary-foreground border-electric shadow-glow"
                : "border-border bg-card text-foreground/80 hover:bg-muted/50",
            )}
          >
            <span>{c.label}</span>
            {typeof c.count === "number" && (
              <span
                className={cn(
                  "rounded-full px-1.5 h-4 grid place-items-center text-[10px] font-bold",
                  active ? "bg-primary-foreground/20" : "bg-muted text-muted-foreground",
                )}
              >
                {c.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
