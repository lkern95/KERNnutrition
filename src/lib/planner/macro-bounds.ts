// src/lib/planner/macro-bounds.ts
export type Macro = 'p'|'c'|'f';
export type BoundSource = 'none'|'preset'|'user';
export type MacroBound = { min: number; max: number; source: BoundSource };
export type MealBounds = { p: MacroBound; c: MacroBound; f: MacroBound; explicitZero?: boolean; role?: 'pre'|'post'|'sleep'|'neutral' };

const mb = (min=0,max=Infinity,source:BoundSource='none'): MacroBound => ({min, max, source});

// Hilfsfunktion: Ableitung der Bounds aus Plan/Inputs.
// - User-Limits (z. B. Abend-Fett ≤9 g) → source:'user' (hart, nicht verletzen).
// - Presets (z. B. Pre-KH ≥85 g) → source:'preset' (darf in Notfällen abgeschwächt werden, aber nur nach Warnung).
export function buildMealBounds(plan:any, inputs:any): MealBounds[] {
  const meals:any[] = Array.isArray(plan?.meals) ? plan.meals : [];
  const out: MealBounds[] = meals.map((m: any, i: number) => {
    const role = m?.role ?? (
      i === meals.length - 1 ? 'sleep' :
      m?.isPre ? 'pre' : m?.isPost ? 'post' : 'neutral'
    );
    const b: MealBounds = {
      p: mb(0, Infinity, 'none'),
      c: mb(0, Infinity, 'none'),
      f: mb(0, Infinity, 'none'),
      role,
      explicitZero: !!m?.explicitZero,
    };

    // Beispielregeln – passe sie an deine Inputs/Limits an:
    // 1) Letzte Mahlzeit: Fettdeckel (z. B. ≤ 9 g) als User-Limit
    if (role === 'sleep' && Number.isFinite(inputs?.limits?.nightFatCapG)) {
      b.f = mb(0, Math.max(0, inputs.limits.nightFatCapG), 'user');
    }

    // 2) Pre: KH-Mindestmenge (z. B. ≥85 g) als Preset-Limit
    if (role === 'pre' && Number.isFinite(inputs?.preset?.preCarbMinG)) {
      b.c = mb(Math.max(0, inputs.preset.preCarbMinG), Infinity, 'preset');
    }

    // 3) Explizit 0-kcal Slots hart schützen
    if (b.explicitZero) {
      b.p = mb(0, 0, 'user'); b.c = mb(0, 0, 'user'); b.f = mb(0, 0, 'user');
    }

    // Weitere Nutzerlimits/Presetgrenzen hier mappen…

    return b;
  });

  return out;
}
