// src/lib/usePlayhead.ts
import * as React from 'react';

type Opts = { duration?: number; ease?: (t: number) => number };
const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);

/**
 * Spielt bei jedem Dep-Change von 0 -> 1 in 'duration' ms ab.
 * Nutze den zurückgegebenen Wert (t) um Phasen zu steuern.
 */
export function usePlayhead(deps: any[], opts: Opts = {}) {
  const { duration = 900, ease = easeOutCubic } = opts;
  const [t, setT] = React.useState(0);
  const startRef = React.useRef<number | null>(null);
  const rafRef = React.useRef<number | null>(null);
  const depKey = JSON.stringify(deps);

  React.useEffect(() => {
    startRef.current = null;
    const step = (ts: number) => {
      if (startRef.current == null) startRef.current = ts;
      const p = Math.min(1, (ts - startRef.current) / duration);
      setT(ease(p));
      if (p < 1) rafRef.current = requestAnimationFrame(step);
      else rafRef.current = null;
    };
    rafRef.current = requestAnimationFrame(step);
    return () => { if (rafRef.current != null) cancelAnimationFrame(rafRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [depKey, duration]);

  return t; // 0..1
}

/** Hilfsfunktion für phasenweises Füllen (gleich lange Drittel) */
export function phaseProgress(t: number, phaseIndex: 0 | 1 | 2, phases = 3) {
  const seg = 1 / phases;
  const start = seg * phaseIndex;
  const local = (t - start) / seg;
  return Math.max(0, Math.min(1, local));
}
