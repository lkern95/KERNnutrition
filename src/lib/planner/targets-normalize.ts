// src/lib/planner/targets-normalize.ts
export type NormTargets = { kcal: number; p: number; c: number; f: number };
const toNum = (x:any): number | undefined => {
  if (typeof x === 'number' && Number.isFinite(x)) return x;
  if (typeof x === 'string') {
    const v = parseFloat(x.replace(',', '.'));
    return Number.isFinite(v) ? v : undefined;
  }
  return undefined;
};
const round = (x:number) => Math.round(x);

export function normalizeTargets(raw:any): NormTargets {
  const kcal = toNum(raw?.kcal);
  if (!kcal) throw new Error('Ziel-kcal fehlt oder ist ungültig');

  const p0 = toNum(raw?.p) ?? 0;
  const f0 = toNum(raw?.f) ?? 0;
  let c0   = toNum(raw?.c);

  let P = Math.max(0, round(p0));
  let F = Math.max(0, round(f0));
  if (c0 == null) {
    const rest = kcal - 4*P - 9*F;
    c0 = Math.max(0, rest / 4);
  }
  let C = Math.max(0, round(c0));

  // kcal-Kohärenz mit minimalem Eingriff über KH sicherstellen
  let diff = kcal - (4*P + 4*C + 9*F);
  if (diff !== 0) {
    const step = round(diff / 4);
    C = Math.max(0, C + step);
    diff = kcal - (4*P + 4*C + 9*F);
  }

  if (P === 0 && C === 0 && F === 0) {
    throw new Error('Makroziele leer: p=c=f=0. Bitte Ziele prüfen.');
  }
  return { kcal, p: P, c: C, f: F };
}
