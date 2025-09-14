// Importiere DEV-Konstante aus computePlan.ts, um Duplikate zu vermeiden
import { __DEV__ } from './computePlan';
// src/lib/planner/macro-allocation.ts
// Minimal-invasive, typ-sichere (aber tolerante) Makro-Allokation in zwei Stufen,
// ohne Abhängigkeiten zum restlichen Code.


type Macro = 'p' | 'c' | 'f';
const KCAL_PER_G: Record<Macro, number> = { p: 4, c: 4, f: 9 };

const clamp = (x: number, lo: number, hi: number) => Math.min(Math.max(x, lo), hi);
const isFiniteNum = (x: any): x is number => typeof x === 'number' && Number.isFinite(x);

// Runde so, dass die Summe exakt passt (größter Rest)
function largestRemainderInt(target: number, shares: number[]): number[] {
  const sumShares = shares.reduce((a, b) => a + b, 0);
  if (sumShares <= 0 || target <= 0) return shares.map(() => 0);
  const raw = shares.map(s => (s / sumShares) * target);
  const base = raw.map(Math.floor);
  let left = target - base.reduce((a, b) => a + b, 0);
  // Deterministisches Tie-Breaking: bei Gleichstand gewinnt der kleinere Index
  const rem = raw
    .map((v, i) => ({ r: v - base[i], i }))
    .sort((a, b) => (b.r === a.r ? a.i - b.i : b.r - a.r));
  for (let k = 0; k < rem.length && left > 0; k++) {
    base[rem[k].i] += 1;
    left--;
  }
  return base;
  for (let k = 0; k < rem.length && left > 0; k++) {
    base[rem[k].i] += 1;
    left--;
  }
  return base;
}

export type MacroBounds = {
  min: Record<Macro, number>; // in Gramm
  max: Record<Macro, number>; // in Gramm
  cap: Record<Macro, number>; // = max - min
};

// Baue Bounds rein aus kcal + optionalen per-Slot-Rules (wenn vorhanden)
export function buildMacroBounds(meals: any[]): MacroBounds[] {
  return meals.map((m) => {
    const kcal = isFiniteNum(m?.kcal) ? m.kcal : 0;

    // ggf. explizite min/max je Macro akzeptieren (wenn vorhanden)
    const ruleMinP = m?.caps?.p?.min ?? m?.min?.p ?? 0;
    const ruleMinC = m?.caps?.c?.min ?? m?.min?.c ?? 0;
    const ruleMinF = m?.caps?.f?.min ?? m?.min?.f ?? 0;

    const ruleMaxP = m?.caps?.p?.max ?? m?.max?.p ?? Infinity;
    const ruleMaxC = m?.caps?.c?.max ?? m?.max?.c ?? Infinity;
    const ruleMaxF = m?.caps?.f?.max ?? m?.max?.f ?? Infinity;

    // kcal-basierte Obergrenzen
    const kcalMaxP = Math.floor(kcal / KCAL_PER_G.p);
    const kcalMaxC = Math.floor(kcal / KCAL_PER_G.c);
    const kcalMaxF = Math.floor(kcal / KCAL_PER_G.f);

    const min: Record<Macro, number> = {
      p: Math.max(0, Math.floor(ruleMinP)),
      c: Math.max(0, Math.floor(ruleMinC)),
      f: Math.max(0, Math.floor(ruleMinF)),
    };

    const max: Record<Macro, number> = {
      p: Math.max(min.p, Math.floor(Math.min(ruleMaxP, kcalMaxP))),
      c: Math.max(min.c, Math.floor(Math.min(ruleMaxC, kcalMaxC))),
      f: Math.max(min.f, Math.floor(Math.min(ruleMaxF, kcalMaxF))),
    };

    const cap: Record<Macro, number> = {
      p: Math.max(0, max.p - min.p),
      c: Math.max(0, max.c - min.c),
      f: Math.max(0, max.f - min.f),
    };

    return { min, max, cap };
  });
}

// Gate: prüft, ob Ziel pro Makro in SUM_MIN..SUM_MAX liegt
export function checkMacroGate(bounds: MacroBounds[], targets: { p:number; c:number; f:number }) {
  const sum = (sel: (b: MacroBounds) => number) => bounds.reduce((a, b) => a + sel(b), 0);

  const sumMin = {
    p: sum(b => b.min.p), c: sum(b => b.min.c), f: sum(b => b.min.f),
  };
  const sumMax = {
    p: sum(b => b.max.p), c: sum(b => b.max.c), f: sum(b => b.max.f),
  };

  const feasible = (
    targets.p >= sumMin.p && targets.p <= sumMax.p &&
    targets.c >= sumMin.c && targets.c <= sumMax.c &&
    targets.f >= sumMin.f && targets.f <= sumMax.f
  );

  return { feasible, sumMin, sumMax };
}

// Allokation für EIN Makro mit 2 Stufen: Minima → Rest kapazitätsproportional (größter Rest)
function allocateOneMacro(meals: any[], bounds: MacroBounds[], macro: Macro, target: number) {
  target = Math.round(target); // statt floor: vermeidet Off-by-one wie 235 vs 236
  const n = meals.length;
  const min = bounds.map(b => b.min[macro]);
  const cap = bounds.map(b => b.cap[macro]);

  // Stufe 1: Minima setzen
  let alloc = min.slice();
  const minSum = min.reduce((a, b) => a + b, 0);
    let rest = Math.max(0, Math.round(target) - minSum);

  // Stufe 2: rest proportional nach Kapazität verteilen
  const capSum = cap.reduce((a, b) => a + b, 0);
  if (rest > 0 && capSum > 0) {
    const extra = largestRemainderInt(rest, cap);
    alloc = alloc.map((v, i) => Math.min(v + extra[i], bounds[i].max[macro]));
  } else if (rest > 0 && capSum === 0) {
    // Kein Platz → Sättigung (weiches Fail; wird vom Caller gehandhabt)
    if (__DEV__) console.warn(`allocateOneMacro: keine Kapazität für ${macro}, rest=${rest}`);
  }

  // Ergebnis in Meals schreiben
  for (let i = 0; i < n; i++) {
    meals[i][macro] = alloc[i];
  }
}

export function allocateMacrosTwoStage(meals: any[], targets: { p:number; c:number; f:number }) {
  const bounds = buildMacroBounds(meals);
  const { feasible, sumMin, sumMax } = checkMacroGate(bounds, targets);

  if (!feasible) {
    // Weiche Behandlung: clamp Ziele in Gate-Spanne, Log für UI
    const clamped = {
      p: clamp(Math.floor(targets.p), sumMin.p, sumMax.p),
      c: clamp(Math.floor(targets.c), sumMin.c, sumMax.c),
      f: clamp(Math.floor(targets.f), sumMin.f, sumMax.f),
    };
    if (__DEV__) console.warn("MacroGate nicht erfüllt – clamp targets", { targets, clamped, sumMin, sumMax });
    targets = clamped;
  }

  // Reihenfolge: Protein → Carbs → Fat (übliches Prior)
  allocateOneMacro(meals, bounds, 'p', targets.p);
  allocateOneMacro(meals, bounds, 'c', targets.c);
  allocateOneMacro(meals, bounds, 'f', targets.f);
}

// Convenience: führt nur aus, wenn aktuell noch keine Makros gesetzt sind
export function allocateAllMacrosIfEmpty(meals: any[], targets: { p:number; c:number; f:number }) {
  const sum = (k: Macro) => meals.reduce((a, m) => a + (isFiniteNum(m?.[k]) ? m[k] : 0), 0);
  const hasAny = sum('p') + sum('c') + sum('f') > 0;
  if (hasAny) {
    if (__DEV__) console.debug("allocateAllMacrosIfEmpty: skip (Makros bereits gesetzt)");
    return;
  }
  allocateMacrosTwoStage(meals, targets);
}
