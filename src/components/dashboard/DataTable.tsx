import { useMemo, useState, type ReactNode } from "react";
import { ChevronLeft, ChevronRight, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { EmptyState, SkeletonRows } from "./EmptyState";
import { cn } from "@/lib/utils";

export type Column<T> = {
  key: string;
  header: string;
  className?: string;
  render: (row: T) => ReactNode;
  mobileLabel?: string;
  hideOnMobile?: boolean;
};

type Props<T> = {
  columns: Column<T>[];
  rows: T[] | undefined;
  loading?: boolean;
  total?: number;
  page?: number;
  pageSize?: number;
  onPageChange?: (page: number) => void;
  onSearchChange?: (q: string) => void;
  searchPlaceholder?: string;
  toolbar?: ReactNode;
  onRowClick?: (row: T) => void;
  emptyTitle?: string;
  emptyDescription?: string;
  rowKey?: (row: T) => string;
};

export function DataTable<T extends { id?: string }>(props: Props<T>) {
  const {
    columns, rows, loading, total = 0, page = 1, pageSize = 20,
    onPageChange, onSearchChange, searchPlaceholder = "بحث...", toolbar,
    onRowClick, emptyTitle, emptyDescription, rowKey,
  } = props;
  const [q, setQ] = useState("");
  const pageCount = useMemo(() => Math.max(1, Math.ceil(total / pageSize)), [total, pageSize]);

  return (
    <div className="space-y-3">
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 justify-between">
        {onSearchChange ? (
          <div className="relative w-full sm:max-w-xs">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={searchPlaceholder}
              value={q}
              onChange={(e) => { setQ(e.target.value); onSearchChange(e.target.value); }}
              className="pr-9"
            />
          </div>
        ) : <div />}
        <div className="flex flex-wrap items-center gap-2">{toolbar}</div>
      </div>

      {loading ? (
        <SkeletonRows />
      ) : !rows || rows.length === 0 ? (
        <EmptyState title={emptyTitle} description={emptyDescription} />
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden md:block rounded-2xl border border-border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-muted-foreground">
                <tr>
                  {columns.map((c) => (
                    <th key={c.key} className={cn("text-right font-medium px-4 py-2.5", c.className)}>{c.header}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row, i) => (
                  <tr
                    key={rowKey?.(row) ?? row.id ?? i}
                    onClick={() => onRowClick?.(row)}
                    className={cn("border-t border-border/60 transition", onRowClick && "hover:bg-muted/40 cursor-pointer")}
                  >
                    {columns.map((c) => (
                      <td key={c.key} className={cn("px-4 py-2.5 align-middle", c.className)}>{c.render(row)}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden space-y-2">
            {rows.map((row, i) => (
              <div
                key={rowKey?.(row) ?? row.id ?? i}
                onClick={() => onRowClick?.(row)}
                className={cn("rounded-2xl border border-border bg-card p-4 space-y-2", onRowClick && "cursor-pointer active:scale-[0.99] transition")}
              >
                {columns.filter((c) => !c.hideOnMobile).map((c) => (
                  <div key={c.key} className="flex items-start justify-between gap-3">
                    <div className="text-xs text-muted-foreground shrink-0">{c.mobileLabel ?? c.header}</div>
                    <div className="text-sm text-right min-w-0">{c.render(row)}</div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </>
      )}

      {onPageChange && total > pageSize && (
        <div className="flex items-center justify-between text-xs text-muted-foreground pt-2">
          <div>الصفحة {page} من {pageCount} · إجمالي {total.toLocaleString("ar-SA")}</div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => onPageChange(page - 1)} disabled={page <= 1}
              className="grid h-8 w-8 place-items-center rounded-lg border border-border disabled:opacity-30"
            ><ChevronRight className="h-4 w-4" /></button>
            <button
              onClick={() => onPageChange(page + 1)} disabled={page >= pageCount}
              className="grid h-8 w-8 place-items-center rounded-lg border border-border disabled:opacity-30"
            ><ChevronLeft className="h-4 w-4" /></button>
          </div>
        </div>
      )}
    </div>
  );
}
