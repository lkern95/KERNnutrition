import * as React from 'react';

type Options = {
  duration?: number;   // ms
  decimals?: number;   // Nachkommastellen
  ease?: (t: number) => number; // Easing
};

const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);

/**
 * Animated number hook. Animiert von altem auf neuen Wert bei Änderungen.
 */
export function useCountUp(value: number, opts: Options = {}) {
  const { duration = 800, decimals = 0, ease = easeOutCubic } = opts;
  const [display, setDisplay] = React.useState<number>(value);
  const fromRef = React.useRef<number>(value);
  const startRef = React.useRef<number | null>(null);
  const rafRef = React.useRef<number | null>(null);

  React.useEffect(() => {
    if (!Number.isFinite(value)) {
      setDisplay(0);
      return;
    }
    const from = fromRef.current;
    const to = value;
    if (from === to) return;

    startRef.current = null;
    const step = (ts: number) => {
      if (startRef.current == null) startRef.current = ts;
      const t = Math.min(1, (ts - startRef.current) / duration);
      const e = ease(t);
      const v = from + (to - from) * e;
      setDisplay(v);
      if (t < 1) {
        rafRef.current = requestAnimationFrame(step);
      } else {
        fromRef.current = to;
        rafRef.current = null;
      }
    };
    rafRef.current = requestAnimationFrame(step);
    return () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    };
  }, [value, duration, ease]);

  // formatiert mit gewünschten Nachkommastellen
  const formatted = React.useMemo(
    () => Number(display).toFixed(decimals),
    [display, decimals]
  );

  return formatted;
}
