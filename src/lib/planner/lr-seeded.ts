// Integer-Split mit Seeded Largest-Remainder
export function lrIntSplitSeeded(total: number, weights: number[], seed: number): number[] {
  const n = weights.length || 1;
  const s = ((seed % n) + n) % n;
  const sumW = weights.reduce((a,b)=>a+(Number.isFinite(b)?Math.max(0,b):0), 0) || 1;
  const parts = weights.map(w => (Math.max(0, Number.isFinite(w) ? w : 0) * total) / sumW);

  const base  = parts.map(Math.floor);
  let assigned = base.reduce((a,b)=>a+b,0);
  const need  = Math.max(0, total - assigned);

  const order = parts
    .map((v,i)=>({ frac: v - Math.floor(v), i }))
    .sort((a,b)=>{
      if (b.frac !== a.frac) return b.frac - a.frac;      // größte Nachkomma zuerst
      const ai = (a.i - s + n) % n;                       // Gleichstand: rotiert ab seed
      const bi = (b.i - s + n) % n;
      return ai - bi;
    })
    .map(x=>x.i);

  for (let k=0; k<need && k<order.length; k++) base[order[k]] += 1;
  return base;
}
// src/lib/planner/lr-seeded.ts
export const normSeed = (seed: number, n: number) =>
  n > 0 ? ((seed % n) + n) % n : 0;

// Largest-Remainder mit Tie-Break über Seed (offset)
export function remainderOrderSeeded(parts: number[], seed: number) {
  const n = parts.length;
  const s = normSeed(seed, n);
  return parts
    .map((v, i) => ({ frac: v - Math.floor(v), i }))
    .sort((a, b) => {
      if (b.frac !== a.frac) return b.frac - a.frac;          // größte Nachkommateile zuerst
      const ai = (a.i - s + n) % n;                            // Gleichstand: rotiert ab seed
      const bi = (b.i - s + n) % n;
      return ai - bi;
    })
    .map(x => x.i);
}
