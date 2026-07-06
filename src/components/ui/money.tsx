import { formatSAR } from "@/lib/format";
import { cn } from "@/lib/utils";

/** New official Saudi Riyal symbol icon (icon-font glyph). */
export function Riyal({ className }: { className?: string }) {
  return <i className={cn("sr", className)} aria-label="ريال سعودي" />;
}

/** Renders a currency amount followed by the new Saudi Riyal symbol. */
export function Money({
  value,
  className,
  symbolClassName,
}: {
  value: number | string | null | undefined;
  className?: string;
  symbolClassName?: string;
}) {
  return (
    <span dir="ltr" className={cn("inline-flex items-baseline gap-1 whitespace-nowrap", className)}>
      <span>{formatSAR(value)}</span>
      <Riyal className={symbolClassName} />
    </span>
  );
}

/** Text-only fallback for contexts that only accept strings (tooltips, table meta). */
export function moneyText(value: number | string | null | undefined): string {
  return `${formatSAR(value)} ﷼`;
}
