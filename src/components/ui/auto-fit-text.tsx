import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

const useIsoLayoutEffect = typeof window !== "undefined" ? useLayoutEffect : useEffect;

/**
 * Scales its children's font-size down (never up) so the content fits on a
 * single line within the parent's width. Prevents wrapping/line-breaks for
 * dynamic values like stat numbers on small screens.
 */
export function AutoFitText({
  children,
  min = 12,
  max = 28,
  className,
}: {
  children: ReactNode;
  /** Minimum font-size in px. */
  min?: number;
  /** Maximum (starting) font-size in px. */
  max?: number;
  className?: string;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLSpanElement>(null);
  const [size, setSize] = useState(max);

  useIsoLayoutEffect(() => {
    const wrap = wrapRef.current;
    const inner = innerRef.current;
    if (!wrap || !inner) return;

    let rafId = 0;
    let lastWidth = 0;
    let lastSize = -1;

    const measure = () => {
      rafId = 0;
      const available = wrap.clientWidth;
      if (!available) return;
      // Skip work when nothing meaningful changed (sub-pixel jitter).
      if (Math.abs(available - lastWidth) < 1) return;
      lastWidth = available;

      // Binary search the largest font-size that fits on one line.
      let lo = min;
      let hi = max;
      let best = min;
      for (let i = 0; i < 8; i++) {
        const mid = (lo + hi) / 2;
        inner.style.fontSize = `${mid}px`;
        if (inner.scrollWidth <= available) {
          best = mid;
          lo = mid;
        } else {
          hi = mid;
        }
      }
      const next = Math.floor(best);
      if (next !== lastSize) {
        lastSize = next;
        setSize(next);
      }
    };

    // Debounce: coalesce bursts of ResizeObserver callbacks into one rAF tick.
    const schedule = () => {
      if (rafId) return;
      rafId = window.requestAnimationFrame(measure);
    };

    schedule();
    const ro = new ResizeObserver(schedule);
    ro.observe(wrap);
    return () => {
      ro.disconnect();
      if (rafId) window.cancelAnimationFrame(rafId);
    };
  }, [children, min, max]);

  return (
    <div ref={wrapRef} className={cn("w-full overflow-hidden", className)}>
      <span
        ref={innerRef}
        className="inline-block whitespace-nowrap leading-tight"
        style={{ fontSize: `${size}px` }}
      >
        {children}
      </span>
    </div>
  );
}
