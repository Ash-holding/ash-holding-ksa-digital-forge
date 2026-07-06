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

    const fit = () => {
      const available = wrap.clientWidth;
      if (!available) return;
      // Start from max and shrink until it fits (or hits min).
      let lo = min;
      let hi = max;
      let best = min;
      // Binary search font-size that fits.
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
      setSize(Math.floor(best));
    };

    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(wrap);
    return () => ro.disconnect();
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
