import { useEffect, useState } from "react";
import { formatSAR } from "@/lib/format";
import { cn } from "@/lib/utils";

/** Unicode fallback for the Saudi Riyal sign when the icon font is unavailable. */
const RIYAL_FALLBACK = "\uFDFC"; // ﷼

/**
 * Detects whether the `saudi riyal symbol` icon font actually loaded.
 * Falls back to the Unicode ﷼ character on failure (blocked CDN, offline, etc.).
 */
function useRiyalFontReady(): boolean {
  const [ready, setReady] = useState<boolean>(() => {
    if (typeof document === "undefined") return true; // SSR: assume ok, hydrate correctly
    return document.fonts?.check?.('1em "saudi riyal symbol"') ?? false;
  });

  useEffect(() => {
    if (ready) return;
    if (typeof document === "undefined" || !document.fonts?.load) return;
    let cancelled = false;
    // Give the font up to ~4s to load; then decide.
    const timer = window.setTimeout(() => {
      if (!cancelled) {
        setReady(document.fonts.check('1em "saudi riyal symbol"'));
      }
    }, 4000);
    document.fonts
      .load('1em "saudi riyal symbol"')
      .then(() => {
        if (cancelled) return;
        setReady(document.fonts.check('1em "saudi riyal symbol"'));
      })
      .catch(() => {
        if (!cancelled) setReady(false);
      });
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [ready]);

  return ready;
}

/** New official Saudi Riyal symbol icon (icon-font glyph) with Unicode fallback. */
export function Riyal({ className }: { className?: string }) {
  const ready = useRiyalFontReady();
  if (!ready) {
    return (
      <span className={cn("font-sans", className)} aria-label="ريال سعودي">
        {RIYAL_FALLBACK}
      </span>
    );
  }
  return <i className={cn("sr", className)} aria-label="ريال سعودي" />;
}

/** Renders a currency amount with the Saudi Riyal symbol on the LEFT of the number. */
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
    <span
      dir="ltr"
      className={cn("inline-flex items-baseline gap-1 whitespace-nowrap", className)}
    >
      <Riyal className={symbolClassName} />
      <span>{formatSAR(value)}</span>
    </span>
  );
}

/** Text-only fallback for contexts that only accept strings (tooltips, table meta). */
export function moneyText(value: number | string | null | undefined): string {
  return `${RIYAL_FALLBACK} ${formatSAR(value)}`;
}

